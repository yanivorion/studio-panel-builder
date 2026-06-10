import { applyPreset } from '../layoutBuilder/builder/gridEngine';
import { layoutKey } from './panelStructure.js';
import { createDefaultGroupLayoutState } from './panelZones.js';
import {
  getCategoryGroupConfig,
  isCategoryPanelGroup,
} from '../data/categoryPanelGroups.js';
import {
  ensureContainerSlotTemplates,
  getContainerSlotTemplateIds,
  isContainerLayoutGroup,
  seedContainerLayoutGroup,
} from './containerGroupDefaults.js';

export function resolveTemplateIdsByPaths(templates, paths) {
  return paths
    .map(path => templates.find(t => t.src === path || t.src.endsWith(path))?.id)
    .filter(Boolean);
}

export function getCategoryGroupTemplateIds(group, templates) {
  if (isContainerLayoutGroup(group)) {
    return getContainerSlotTemplateIds(group);
  }
  const config = getCategoryGroupConfig(group?.id, group);
  if (!config) return [];
  return resolveTemplateIdsByPaths(templates, config.paths);
}

export function seedCategoryGroupLayout(group, templates, layoutState, canvasWidth = 440) {
  if (isContainerLayoutGroup(group)) {
    const { templates: withSlots } = ensureContainerSlotTemplates(group, templates);
    return seedContainerLayoutGroup(group, withSlots, layoutState, canvasWidth);
  }

  const config = getCategoryGroupConfig(group?.id, group);
  if (!config) return layoutState;

  const templateIds = getCategoryGroupTemplateIds(group, templates);
  if (!templateIds.length) return layoutState;

  const presetId = config.previewPreset ?? 'strip-horizontal';
  const bp = layoutState.gridEngine?.breakpoints?.find(
    b => b.key === layoutState.activeBreakpointKey,
  ) ?? layoutState.gridEngine?.breakpoints?.[0];
  if (!bp) return layoutState;

  const cols = bp?.gridConfig?.cols ?? 6;
  const result = applyPreset(
    presetId,
    templates,
    templateIds,
    cols,
    undefined,
    {
      containerWidth: canvasWidth,
      gap: bp?.gridConfig?.margin?.[0] ?? 12,
      rowHeight: bp?.gridConfig?.rowHeight ?? 80,
    },
  );

  return {
    ...layoutState,
    layoutSeeded: true,
    orderedTemplateIds: templateIds,
    gridEngine: {
      ...layoutState.gridEngine,
      breakpoints: layoutState.gridEngine?.breakpoints?.map(b =>
        b.key === (layoutState.activeBreakpointKey ?? b.key)
          ? {
              ...b,
              galleryLayout: result.galleryLayout ?? b.galleryLayout ?? 'Collage',
              compactor: result.galleryLayout === 'Collage' ? 'none' : 'vertical',
              items: result.items,
              presetId,
            }
          : b,
      ),
    },
  };
}

export function initCategoryGroupLayouts(groups, templates, createLayoutState, canvasWidth = 440) {
  const layouts = {};
  (groups ?? []).forEach(group => {
    if (!isCategoryPanelGroup(group)) return;
    ['preview', 'subgroup'].forEach(layer => {
      const key = layoutKey(group.id, layer);
      let state = createLayoutState();

      if (isContainerLayoutGroup(group)) {
        const { templates: withSlots } = ensureContainerSlotTemplates(group, templates);
        state = seedContainerLayoutGroup(group, withSlots, state, canvasWidth);
        layouts[key] = state;
        return;
      }

      const config = getCategoryGroupConfig(group.id, group);
      const ids = getCategoryGroupTemplateIds(group, templates);
      state = { ...state, orderedTemplateIds: ids };

      const presetId = layer === 'subgroup'
        ? (config?.subgroupPreset ?? config?.previewPreset ?? 'strip-horizontal')
        : (config?.previewPreset ?? 'strip-horizontal');

      if (ids.length) {
        const bp = state.gridEngine?.breakpoints?.find(
          b => b.key === state.activeBreakpointKey,
        ) ?? state.gridEngine?.breakpoints?.[0];
        if (!bp) {
          layouts[key] = state;
          return;
        }
        const cols = bp?.gridConfig?.cols ?? 6;
        const result = applyPreset(
          presetId,
          templates,
          ids,
          cols,
          undefined,
          {
            containerWidth: canvasWidth,
            gap: bp?.gridConfig?.margin?.[0] ?? 12,
            rowHeight: bp?.gridConfig?.rowHeight ?? 80,
          },
        );
        state = {
          ...state,
          layoutSeeded: true,
          gridEngine: {
            ...state.gridEngine,
            breakpoints: state.gridEngine?.breakpoints?.map(b =>
              b.key === (state.activeBreakpointKey ?? b.key)
                ? {
                    ...b,
                    galleryLayout: result.galleryLayout ?? b.galleryLayout ?? 'Collage',
                    compactor: result.galleryLayout === 'Collage' ? 'none' : 'vertical',
                    items: result.items,
                    presetId,
                  }
                : b,
            ),
          },
        };
      }

      layouts[key] = state;
    });
  });
  return layouts;
}

export function mergeCategoryGroupsIntoLayouts(groups, templates, groupLayouts, createLayoutState) {
  // initCategoryGroupLayouts needs a zero-arg "create one layout" factory.
  // createLayoutState is (grps, templates) => allLayouts, so calling it without
  // args returns {} (not a single layout state), which leaves gridEngine undefined.
  // Always pass createDefaultGroupLayoutState here — it's the correct factory.
  const seeded = initCategoryGroupLayouts(groups, templates, createDefaultGroupLayoutState);
  const next = { ...groupLayouts };
  Object.entries(seeded).forEach(([key, layout]) => {
    next[key] = layout;
  });
  return next;
}
