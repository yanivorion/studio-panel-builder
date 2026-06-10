import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';
import { APP_CATEGORY_GROUPS, TEMPLATE_CATEGORY_IDS } from '../data/categoryPanelGroups.js';
import { slugify } from './panelZones.js';

/** @typedef {'actions'|'branded'|'site-files'|'stunning'} BuiltinKind */

/**
 * Group = labeled section in category content (e.g. "Branded Elements", "Site files").
 * Preview layout = small row shown in panel. Subgroup layout = drill-in after "See more".
 */
export function createGroup({ id, name, categoryId, kind = 'custom', builtin = null, sortOrder = 0, layoutTemplateId = null }) {
  return {
    id,
    name,
    categoryId,
    kind,
    builtin,
    sortOrder,
    ...(layoutTemplateId ? { layoutTemplateId } : {}),
  };
}

export const DEFAULT_HOME_GROUPS = [
  createGroup({ id: 'grp-quick-actions', name: 'Quick actions', categoryId: 'home', kind: 'builtin', builtin: 'actions', sortOrder: 0 }),
  createGroup({ id: 'grp-branded', name: 'Branded Elements', categoryId: 'home', kind: 'builtin', builtin: 'branded', sortOrder: 1 }),
  createGroup({ id: 'grp-site-files', name: 'Site files', categoryId: 'home', kind: 'builtin', builtin: 'site-files', sortOrder: 2 }),
  createGroup({ id: 'grp-stunning', name: 'Make your site stunning', categoryId: 'home', kind: 'builtin', builtin: 'stunning', sortOrder: 3 }),
];

const BUILTIN_KIND_BY_ID = Object.fromEntries(
  DEFAULT_HOME_GROUPS.map(g => [g.id, g.builtin]),
);

/** Built-in home sections — always use designed preview UI in site editor */
export function resolveBuiltinKind(group) {
  if (group?.builtin) return group.builtin;
  return BUILTIN_KIND_BY_ID[group?.id] ?? null;
}

export function isBuiltinGroup(group) {
  return group?.kind === 'builtin' || !!resolveBuiltinKind(group);
}

/** Restore kind/builtin metadata when loading saved panel configs */
export function normalizePanelGroups(groups) {
  const defaultsById = Object.fromEntries(DEFAULT_HOME_GROUPS.map(g => [g.id, g]));
  return (groups ?? []).map(group => {
    const def = defaultsById[group.id];
    if (!def) return group;
    return {
      ...def,
      ...group,
      kind: 'builtin',
      builtin: def.builtin,
    };
  });
}

export function layoutKey(groupId, layer) {
  return `${groupId}:${layer}`;
}

export function parseLayoutKey(key) {
  const idx = key.lastIndexOf(':');
  if (idx === -1) return { groupId: key, layer: 'preview' };
  return { groupId: key.slice(0, idx), layer: key.slice(idx + 1) };
}

const TEMPLATE_CATEGORY_ID_SET = new Set(TEMPLATE_CATEGORY_IDS);

/** Layout tools moved out of Box — drop stale saved groups on merge */
export const DEPRECATED_PANEL_GROUP_IDS = [
  'grp-box-sections-grids',
  'grp-box-repeaters',
  'grp-box-accordion',
  'grp-box-slideshow-repeater',
  'grp-box-tabs',
  'grp-box-stacks',
  'grp-box-tables',
  'grp-box-css-grid',
];

export const DEFAULT_APP_CATEGORY_GROUPS = APP_CATEGORY_GROUPS.map(
  ({ id, name, categoryId, sortOrder, layoutTemplateId }) => {
    const group = createGroup({ id, name, categoryId, kind: 'templates', sortOrder });
    return layoutTemplateId ? { ...group, layoutTemplateId } : group;
  },
);

export function buildDefaultGroups(categories = DEFAULT_CATEGORIES) {
  const groups = [...DEFAULT_HOME_GROUPS];

  const activeTemplateCats = new Set(
    categories.filter(c => TEMPLATE_CATEGORY_ID_SET.has(c.id)).map(c => c.id),
  );
  DEFAULT_APP_CATEGORY_GROUPS
    .filter(g => activeTemplateCats.has(g.categoryId))
    .forEach(g => groups.push({ ...g }));

  categories
    .filter(c => c.id !== 'home' && !TEMPLATE_CATEGORY_ID_SET.has(c.id))
    .forEach(cat => {
      groups.push(createGroup({
        id: `grp-${cat.id}-catalog`,
        name: cat.label,
        categoryId: cat.id,
        kind: 'catalog',
        sortOrder: 0,
      }));
    });

  return groups;
}

/** Merge saved panel config with current default categories + app groups */
export function mergeDefaultPanelStructure(savedCategories, savedGroups) {
  const categoryIds = new Set(DEFAULT_CATEGORIES.map(c => c.id));
  const categories = [...DEFAULT_CATEGORIES];
  (savedCategories ?? []).forEach(c => {
    if (c?.id && !categoryIds.has(c.id)) {
      categories.push(c);
      categoryIds.add(c.id);
    }
  });

  const defaultGroups = buildDefaultGroups(categories);
  const defaultById = Object.fromEntries(defaultGroups.map(g => [g.id, g]));
  const savedById = Object.fromEntries((savedGroups ?? []).map(g => [g.id, g]));

  // Drop legacy single-catalog groups for template categories
  const legacyCatalogIds = TEMPLATE_CATEGORY_IDS.map(id => `grp-${id}-catalog`);

  // Preserve default category order (saved configs may list categories in an old order)
  const labelById = Object.fromEntries(DEFAULT_CATEGORIES.map(c => [c.id, c.label]));
  const categoriesOrdered = categories.map(c => ({
    ...c,
    label: labelById[c.id] ?? c.label,
  }));

  const groups = defaultGroups.map(def => {
    const saved = savedById[def.id];
    if (!saved) return def;
    if (def.kind === 'builtin') {
      return { ...def, sortOrder: saved.sortOrder ?? def.sortOrder };
    }
    return { ...def, ...saved, kind: def.kind, categoryId: def.categoryId };
  });

  Object.values(savedById).forEach(saved => {
    if (!saved?.id || defaultById[saved.id]) return;
    if (legacyCatalogIds.includes(saved.id)) return;
    if (DEPRECATED_PANEL_GROUP_IDS.includes(saved.id)) return;
    groups.push(saved);
  });

  return { categories: categoriesOrdered, groups };
}

export function getGroupsForCategory(groups, categoryId) {
  return groups
    .filter(g => g.categoryId === categoryId)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}

export function reorderCategoryGroups(groups, categoryId, fromIndex, toIndex) {
  if (fromIndex === toIndex) return groups;
  const inCat = getGroupsForCategory(groups, categoryId);
  const [moved] = inCat.splice(fromIndex, 1);
  if (!moved) return groups;
  inCat.splice(toIndex, 0, moved);
  const orderMap = Object.fromEntries(inCat.map((g, i) => [g.id, i]));
  return groups.map(g =>
    g.categoryId === categoryId ? { ...g, sortOrder: orderMap[g.id] ?? g.sortOrder } : g,
  );
}

export function nextSortOrder(groups, categoryId) {
  const inCat = getGroupsForCategory(groups, categoryId);
  return inCat.length ? Math.max(...inCat.map(g => g.sortOrder ?? 0)) + 1 : 0;
}

export function createGroupForCategory(name, categoryId, sortOrder = 0) {
  const id = `grp-${slugify(name)}-${Date.now()}`;
  return createGroup({ id, name, categoryId, kind: 'custom', sortOrder });
}

/** Add a container wireframe from CONTAINER_LAYOUT_LIBRARY to any category */
export function createGroupFromLayoutTemplate(template, categoryId, sortOrder = 0) {
  const id = `grp-${slugify(template.name)}-${Date.now()}`;
  return createGroup({
    id,
    name: template.name,
    categoryId,
    kind: 'templates',
    sortOrder,
    layoutTemplateId: template.id,
  });
}

export function addCategoryWithGroups(categories, groups, label) {
  const id = slugify(label);
  if (categories.some(c => c.id === id)) return null;
  const newCat = { id, label };
  return {
    categories: [...categories, newCat],
    groups: [...groups],
    categoryId: id,
  };
}

export function removeCategoryGroups(groups, groupLayouts, categoryId) {
  const removedGroups = groups.filter(g => g.categoryId === categoryId);
  const nextGroups = groups.filter(g => g.categoryId !== categoryId);
  const nextLayouts = { ...groupLayouts };
  removedGroups.forEach(g => {
    delete nextLayouts[layoutKey(g.id, 'preview')];
    delete nextLayouts[layoutKey(g.id, 'subgroup')];
  });
  return { groups: nextGroups, groupLayouts: nextLayouts };
}
