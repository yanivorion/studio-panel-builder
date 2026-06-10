import { applyPreset } from '../layoutBuilder/builder/gridEngine';
import { layoutKey } from './panelStructure.js';

/** Panel asset paths per built-in group — used for template list + layout seeding */
export const BUILTIN_ASSET_PATHS = {
  actions: [
    '/panel/icon-upload.png',
    '/panel/icon-gen-image.png',
    '/panel/icon-gen-element.png',
  ],
  branded: [
    '/panel/brand-heading.png',
    '/panel/brand-btn-fill.png',
    '/panel/brand-box.png',
    '/panel/brand-line.png',
    '/panel/brand-btn-outline.png',
    '/panel/brand-para.png',
  ],
  'site-files': [
    '/panel/photo-1.png',
    '/panel/photo-2.png',
    '/panel/photo-3.png',
    '/panel/photo-4.png',
    '/panel/photo-5.png',
  ],
  stunning: [
    '/panel/sticker-cat.png',
    '/panel/sticker-house.png',
    '/panel/sticker-smarter.png',
    '/panel/sticker-bow.png',
    '/panel/sticker-newproject.png',
    '/panel/sticker-offer.png',
  ],
};

/** Default preset per built-in group when seeding editable layout */
export const BUILTIN_SEED_PRESETS = {
  actions: 'strip-horizontal',
  branded: 'collage-rows-3',
  'site-files': 'strip-horizontal',
  stunning: 'collage-rows-3',
};

export function resolveTemplateIdsByPaths(templates, paths) {
  return paths
    .map(path => templates.find(t => t.src === path || t.src.endsWith(path))?.id)
    .filter(Boolean);
}

export function getBuiltinTemplateIds(group, templates) {
  if (!group?.builtin) return [];
  const paths = BUILTIN_ASSET_PATHS[group.builtin] ?? [];
  return resolveTemplateIdsByPaths(templates, paths);
}

export function seedBuiltinGroupLayout(group, templates, layoutState, canvasWidth = 440) {
  if (!group?.builtin) return layoutState;
  const templateIds = getBuiltinTemplateIds(group, templates);
  if (!templateIds.length) return layoutState;

  const presetId = BUILTIN_SEED_PRESETS[group.builtin] ?? 'collage-rows-3';
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
    group.builtin === 'stunning' ? {
      containerWidth: canvasWidth,
      gap: bp?.gridConfig?.margin?.[0] ?? 12,
      paddingX: layoutState.itemPaddingX ?? 8,
      paddingY: layoutState.itemPaddingY ?? 8,
      settings: bp?.collageSettings ?? { targetRowHeight: 200, minItemSize: 80, groupPattern: '' },
      templateScales: layoutState.templateScales ?? {},
    } : undefined,
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

export function initBuiltinGroupLayouts(groups, templates, createLayoutState) {
  const layouts = {};
  (groups ?? []).forEach(group => {
    ['preview', 'subgroup'].forEach(layer => {
      const key = layoutKey(group.id, layer);
      let state = createLayoutState();
      if (group.kind === 'builtin') {
        const ids = getBuiltinTemplateIds(group, templates);
        state = { ...state, orderedTemplateIds: ids };
      }
      layouts[key] = state;
    });
  });
  return layouts;
}
