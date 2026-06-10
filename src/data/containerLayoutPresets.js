/**
 * Container layout wireframes — each layout = N grid slots (upload placeholders),
 * not a single composite PNG.
 */

/** @typedef {{ label: string, x: number, y: number, w: number, h: number }} ContainerSlotDef */

/** @typedef {{
 *   id: string,
 *   name: string,
 *   thumbPath: string,
 *   slotCount: number,
 *   cols: number,
 *   rows: number,
 *   slots: ContainerSlotDef[],
 * }} ContainerLayoutDef */

/** @type {Record<string, ContainerLayoutDef>} */
export const CONTAINER_LAYOUT_DEFINITIONS = {
  'container-split-3': {
    id: 'container-split-3',
    name: 'Split columns',
    thumbPath: '/panel/layout-tools/container-split-3.png',
    slotCount: 3,
    cols: 12,
    rows: 9,
    slots: [
      { label: 'Slot 1', x: 0, y: 0, w: 5, h: 2 },
      { label: 'Slot 2', x: 0, y: 2, w: 5, h: 7 },
      { label: 'Slot 3', x: 5, y: 0, w: 7, h: 9 },
    ],
  },
  'container-stagger-4': {
    id: 'container-stagger-4',
    name: 'Staggered grid',
    thumbPath: '/panel/layout-tools/container-stagger-4.png',
    slotCount: 4,
    cols: 12,
    rows: 9,
    slots: [
      { label: 'Slot 1', x: 0, y: 0, w: 5, h: 2 },
      { label: 'Slot 2', x: 0, y: 2, w: 5, h: 7 },
      { label: 'Slot 3', x: 5, y: 0, w: 7, h: 5 },
      { label: 'Slot 4', x: 5, y: 5, w: 7, h: 4 },
    ],
  },
  'container-masonry-7': {
    id: 'container-masonry-7',
    name: 'Masonry grid',
    thumbPath: '/panel/layout-tools/container-masonry-7.png',
    slotCount: 7,
    cols: 12,
    rows: 10,
    slots: [
      { label: 'Slot 1', x: 0, y: 0, w: 4, h: 2 },
      { label: 'Slot 2', x: 0, y: 2, w: 4, h: 4 },
      { label: 'Slot 3', x: 0, y: 6, w: 4, h: 4 },
      { label: 'Slot 4', x: 4, y: 0, w: 4, h: 5 },
      { label: 'Slot 5', x: 4, y: 5, w: 4, h: 5 },
      { label: 'Slot 6', x: 8, y: 0, w: 4, h: 4 },
      { label: 'Slot 7', x: 8, y: 4, w: 4, h: 6 },
    ],
  },
  'container-bento-5': {
    id: 'container-bento-5',
    name: 'Bento grid',
    thumbPath: '/panel/layout-tools/container-bento-5.png',
    slotCount: 5,
    cols: 12,
    rows: 6,
    slots: [
      { label: 'Slot 1', x: 0, y: 0, w: 5, h: 4 },
      { label: 'Slot 2', x: 0, y: 4, w: 5, h: 1 },
      { label: 'Slot 3', x: 0, y: 5, w: 5, h: 1 },
      { label: 'Slot 4', x: 5, y: 0, w: 7, h: 4 },
      { label: 'Slot 5', x: 5, y: 4, w: 7, h: 2 },
    ],
  },
  'container-grid-2x3': {
    id: 'container-grid-2x3',
    name: 'Grid 2×3',
    thumbPath: '/panel/layout-tools/container-grid-2x3.png',
    slotCount: 6,
    cols: 12,
    rows: 9,
    slots: [
      { label: 'Slot 1', x: 0, y: 0, w: 6, h: 3 },
      { label: 'Slot 2', x: 6, y: 0, w: 6, h: 3 },
      { label: 'Slot 3', x: 0, y: 3, w: 6, h: 3 },
      { label: 'Slot 4', x: 6, y: 3, w: 6, h: 3 },
      { label: 'Slot 5', x: 0, y: 6, w: 6, h: 3 },
      { label: 'Slot 6', x: 6, y: 6, w: 6, h: 3 },
    ],
  },
};

export const CONTAINER_LAYOUT_LIBRARY = Object.values(CONTAINER_LAYOUT_DEFINITIONS).map(def => ({
  id: def.id,
  name: def.name,
  path: def.thumbPath,
  slotCount: def.slotCount,
}));

export function getContainerLayoutDef(layoutTemplateId) {
  if (!layoutTemplateId) return null;
  return CONTAINER_LAYOUT_DEFINITIONS[layoutTemplateId] ?? null;
}

export function containerSlotTemplateId(groupId, slotIndex) {
  return `tpl-${groupId}-slot-${slotIndex}`;
}

export function isContainerSlotTemplateId(templateId, groupId) {
  return typeof templateId === 'string'
    && typeof groupId === 'string'
    && templateId === containerSlotTemplateId(groupId, Number(templateId.split('-slot-').pop()));
}

export function isContainerSlotForGroup(templateId, group) {
  if (!group?.id || !group?.layoutTemplateId || !templateId) return false;
  const prefix = `tpl-${group.id}-slot-`;
  return templateId.startsWith(prefix);
}

function placeholderSvg(label) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <rect width="400" height="300" rx="20" fill="#3a3a42"/>
  <text x="200" y="150" text-anchor="middle" dominant-baseline="middle" fill="#8b8b96" font-family="system-ui,sans-serif" font-size="20">${label}</text>
</svg>`;
}

/** Create gray placeholder templates — one per grid slot */
export function createContainerSlotTemplates(groupId, def) {
  return def.slots.map((slot, index) => {
    const id = containerSlotTemplateId(groupId, index);
    const src = `data:image/svg+xml,${encodeURIComponent(placeholderSvg(slot.label))}`;
    return {
      id,
      name: slot.label,
      src,
      width: 400,
      height: 300,
      isPlaceholder: true,
      containerSlot: true,
      slotIndex: index,
      groupId,
    };
  });
}

/** Build RGL items — item.i = template id for each slot */
export function buildContainerLayoutItems(groupId, def) {
  return def.slots.map((slot, index) => ({
    i: containerSlotTemplateId(groupId, index),
    x: slot.x,
    y: slot.y,
    w: slot.w,
    h: slot.h,
    minW: slot.w,
    minH: slot.h,
    static: true,
  }));
}

export function resolveGroupLayoutTemplateId(group, staticConfig = null) {
  if (group?.layoutTemplateId) return group.layoutTemplateId;
  return staticConfig?.layoutTemplateId ?? null;
}
