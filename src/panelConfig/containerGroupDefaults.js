import {
  buildContainerLayoutItems,
  containerSlotTemplateId,
  createContainerSlotTemplates,
  getContainerLayoutDef,
  isContainerSlotForGroup,
  resolveGroupLayoutTemplateId,
} from '../data/containerLayoutPresets.js';
import { GROUP_CONFIG_BY_ID } from '../data/categoryPanelGroups.js';

export function isContainerLayoutGroup(group) {
  return Boolean(resolveGroupLayoutTemplateId(group, GROUP_CONFIG_BY_ID[group?.id]));
}

export function getContainerSlotTemplateIds(group) {
  const def = getContainerLayoutDef(
    resolveGroupLayoutTemplateId(group, GROUP_CONFIG_BY_ID[group?.id]),
  );
  if (!def || !group?.id) return [];
  return def.slots.map((_, index) => containerSlotTemplateId(group.id, index));
}

export function ensureContainerSlotTemplates(group, templates) {
  const def = getContainerLayoutDef(
    resolveGroupLayoutTemplateId(group, GROUP_CONFIG_BY_ID[group?.id]),
  );
  if (!def || !group?.id) return { templates: [], created: [] };

  const existing = new Set(templates.map(t => t.id));
  const created = createContainerSlotTemplates(group.id, def).filter(t => !existing.has(t.id));
  return {
    templates: [...templates, ...created],
    created,
  };
}

export function seedContainerLayoutGroup(group, templates, layoutState, canvasWidth = 440) {
  const def = getContainerLayoutDef(
    resolveGroupLayoutTemplateId(group, GROUP_CONFIG_BY_ID[group?.id]),
  );
  if (!def || !group?.id) return layoutState;

  const slotIds = getContainerSlotTemplateIds(group);
  const hasAllSlots = slotIds.every(id => templates.some(t => t.id === id));
  if (!hasAllSlots) return layoutState;

  const gap = layoutState.gridEngine?.breakpoints?.[0]?.gridConfig?.margin?.[0] ?? 12;
  const rowHeight = Math.max(
    36,
    Math.round((canvasWidth - (def.cols + 1) * gap) / def.cols),
  );

  const items = buildContainerLayoutItems(group.id, def);
  const activeKey = layoutState.activeBreakpointKey
    ?? layoutState.gridEngine?.breakpoints?.[0]?.key
    ?? 'bp-narrow';

  return {
    ...layoutState,
    layoutSeeded: true,
    orderedTemplateIds: slotIds,
    gridEngine: {
      ...layoutState.gridEngine,
      breakpoints: layoutState.gridEngine.breakpoints.map(bp =>
        bp.key === activeKey
          ? {
              ...bp,
              galleryLayout: 'Grid',
              compactor: 'none',
              presetId: `container-${def.id}`,
              gridConfig: {
                ...bp.gridConfig,
                cols: def.cols,
                rowHeight,
              },
              items,
            }
          : bp,
      ),
    },
  };
}

export function mergeContainerSlotTemplatesIntoCatalog(groups, templates) {
  let next = [...(templates ?? [])];
  (groups ?? []).forEach(group => {
    if (!isContainerLayoutGroup(group)) return;
    next = ensureContainerSlotTemplates(group, next).templates;
  });
  return next;
}
