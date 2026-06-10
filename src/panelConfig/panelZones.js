import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';
import { createDefaultBreakpoint } from '../layoutBuilder/builder/gridEngine';

export function slugify(label) {
  return label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'zone';
}

/** Content zone = one layout-editable area inside the Add Panel */
export function createZone({ id, name, tab, categoryId = null }) {
  return { id, name, tab, categoryId };
}

export function buildDefaultZones(categories = DEFAULT_CATEGORIES) {
  const zones = [
    createZone({ id: 'zone-elements-home', name: 'Home', tab: 'Elements', categoryId: 'home' }),
    ...categories
      .filter(c => c.id !== 'home')
      .map(c => createZone({
        id: `zone-elements-${c.id}`,
        name: c.label,
        tab: 'Elements',
        categoryId: c.id,
      })),
    createZone({ id: 'zone-sections', name: 'Sections', tab: 'Sections', categoryId: null }),
    createZone({ id: 'zone-apps', name: 'Apps', tab: 'Apps', categoryId: null }),
  ];
  return zones;
}

export function createEmptyZoneLayout(templateIds = []) {
  return {
    gridEngine: {
      version: 1,
      defaultPresetId: 'default',
      breakpoints: [
        createDefaultBreakpoint('bp-narrow', 'Narrow', 0, templateIds),
        createDefaultBreakpoint('bp-wide', 'Wide', 480, templateIds),
      ],
    },
    orderedTemplateIds: [...templateIds],
    activeBreakpointKey: 'bp-narrow',
    layoutSeeded: false,
  };
}

/** Default layout state for a panel group (preview or subgroup layer). */
export function createDefaultGroupLayoutState() {
  const base = createEmptyZoneLayout([]);
  return {
    ...base,
    containerPadding: 12,
    itemPaddingX: 8,
    itemPaddingY: 8,
    itemBorderRadius: 10,
    templateScales: {},
    templateObjectFit: {},
    templatePadding: {},
    templateBadges: {},
    layoutSeeded: false,
  };
}

export function buildInitialZoneLayouts(zones, allTemplateIds = []) {
  return zones.reduce((acc, zone) => {
    acc[zone.id] = createEmptyZoneLayout(allTemplateIds);
    return acc;
  }, {});
}

export function findZoneByTabCategory(zones, tab, categoryId) {
  if (tab === 'Elements') {
    return zones.find(z => z.tab === 'Elements' && z.categoryId === categoryId)
      ?? zones.find(z => z.id === 'zone-elements-home');
  }
  if (tab === 'Sections') return zones.find(z => z.id === 'zone-sections');
  if (tab === 'Apps') return zones.find(z => z.id === 'zone-apps');
  return zones[0] ?? null;
}

export function tabCategoryFromZone(zone) {
  if (!zone) return { tab: 'Elements', categoryId: 'home' };
  return { tab: zone.tab, categoryId: zone.categoryId ?? 'home' };
}

export function rebuildZonesFromCategories(categories) {
  return buildDefaultZones(categories);
}
