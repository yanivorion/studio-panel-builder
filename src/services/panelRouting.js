import { preparePanelConfigForSave } from './panelConfigSerialize.js';
import { FLOW_IDS } from '../data/flows.js';

export const PANEL_STATE_VERSION = 2;
export const GLOBAL_PANEL_PAGE_ID = '__global__';
export const DEFAULT_PRESET_ID = 'full';

/** @typedef {{ id: string, name: string, hiddenGroups?: string[], hiddenCategories?: string[], overrides?: object }} PanelPreset */
/** @typedef {{ default?: string, pages?: Record<string, string | { preset?: string, patch?: object }> }} SiteRouting */

export const STARTER_PRESETS = {
  full: {
    id: 'full',
    name: 'Full',
    hiddenGroups: [],
    hiddenCategories: [],
    overrides: {},
  },
  retail: {
    id: 'retail',
    name: 'Retail',
    hiddenGroups: [],
    hiddenCategories: ['events', 'bookings'],
    overrides: {},
  },
  minimal: {
    id: 'minimal',
    name: 'Minimal',
    hiddenGroups: ['grp-stunning'],
    hiddenCategories: ['stores', 'events', 'bookings', 'form', 'popup', 'social'],
    overrides: {},
  },
};

export function pagePatchKey(flowId, pageId) {
  return `${flowId}:${pageId}`;
}

export function createDefaultPanelState() {
  return {
    version: PANEL_STATE_VERSION,
    globalPanel: null,
    presets: { ...STARTER_PRESETS },
    routing: Object.fromEntries(FLOW_IDS.map(id => [id, { default: DEFAULT_PRESET_ID, pages: {} }])),
    pagePatches: {},
    /** Per-page show/hide — tiny JSON, keyed `flowId:pageId` */
    pageVisibility: {},
  };
}

export function getPageVisibility(panelState, flowId, pageId) {
  const key = pagePatchKey(flowId, pageId);
  const vis = panelState?.pageVisibility?.[key];
  return {
    hiddenGroups: vis?.hiddenGroups ?? [],
    hiddenCategories: vis?.hiddenCategories ?? [],
  };
}

export function setPageVisibility(pageVisibility, flowId, pageId, visibility) {
  const key = pagePatchKey(flowId, pageId);
  return {
    ...pageVisibility,
    [key]: {
      hiddenGroups: visibility?.hiddenGroups ?? [],
      hiddenCategories: visibility?.hiddenCategories ?? [],
    },
  };
}

export function togglePageGroupHidden(panelState, flowId, pageId, groupId) {
  const current = getPageVisibility(panelState, flowId, pageId);
  const hidden = new Set(current.hiddenGroups);
  if (hidden.has(groupId)) hidden.delete(groupId);
  else hidden.add(groupId);
  return {
    ...panelState,
    pageVisibility: setPageVisibility(panelState.pageVisibility ?? {}, flowId, pageId, {
      ...current,
      hiddenGroups: [...hidden],
    }),
  };
}

export function togglePageCategoryHidden(panelState, flowId, pageId, categoryId) {
  const current = getPageVisibility(panelState, flowId, pageId);
  const hidden = new Set(current.hiddenCategories);
  if (hidden.has(categoryId)) hidden.delete(categoryId);
  else hidden.add(categoryId);
  return {
    ...panelState,
    pageVisibility: setPageVisibility(panelState.pageVisibility ?? {}, flowId, pageId, {
      ...current,
      hiddenCategories: [...hidden],
    }),
  };
}

function mergeTemplates(base, overlay) {
  const byId = new Map();
  (base ?? []).forEach(t => { if (t?.id) byId.set(t.id, t); });
  (overlay ?? []).forEach(t => { if (t?.id) byId.set(t.id, t); });
  return [...byId.values()];
}

/** Shallow merge of panel slim configs — later layers win on conflicts. */
export function mergePanelLayers(...layers) {
  let merged = null;

  for (const layer of layers) {
    if (!layer) continue;
    if (!merged) {
      merged = { ...layer };
      continue;
    }
    merged = {
      version: layer.version || merged.version || 'panel-edit-6',
      layoutName: layer.layoutName ?? merged.layoutName ?? '',
      categories: layer.categories?.length ? layer.categories : merged.categories,
      groups: layer.groups?.length ? layer.groups : merged.groups,
      customTemplates: mergeTemplates(merged.customTemplates, layer.customTemplates),
      groupLayouts: { ...(merged.groupLayouts ?? {}), ...(layer.groupLayouts ?? {}) },
    };
  }

  return merged;
}

export function resolvePresetId(routing, flowId, pageId) {
  const site = routing?.[flowId];
  if (!site) return DEFAULT_PRESET_ID;

  const pageRule = site.pages?.[pageId];
  if (typeof pageRule === 'string') return pageRule;
  if (pageRule?.preset) return pageRule.preset;

  return site.default ?? DEFAULT_PRESET_ID;
}

export function isPageRoutingOverride(routing, flowId, pageId) {
  const pageRule = routing?.[flowId]?.pages?.[pageId];
  return pageRule != null && pageRule !== '';
}

export function getPagePatch(pagePatches, flowId, pageId) {
  return pagePatches?.[pagePatchKey(flowId, pageId)] ?? null;
}

export function applyVisibility(config, visibility) {
  if (!visibility) return config;
  const hiddenGroups = new Set(visibility.hiddenGroups ?? []);
  const hiddenCategories = new Set(visibility.hiddenCategories ?? []);

  const categories = (config.categories ?? []).filter(c => !hiddenCategories.has(c.id));
  const visibleCategoryIds = new Set(categories.map(c => c.id));

  const groups = (config.groups ?? []).filter(g => {
    if (hiddenGroups.has(g.id)) return false;
    if (g.categoryId && hiddenCategories.has(g.categoryId)) return false;
    if (g.categoryId && !visibleCategoryIds.has(g.categoryId)) return false;
    return true;
  });

  return { ...config, categories, groups };
}

/** @deprecated use applyVisibility */
export function applyPresetVisibility(config, preset) {
  if (!preset) return config;
  return applyVisibility(config, {
    hiddenGroups: preset.hiddenGroups,
    hiddenCategories: preset.hiddenCategories,
  });
}

/**
 * Resolve the effective panel snapshot for a site + page.
 * Order: global → page layout patch → per-page visibility filter.
 */
export function resolveEffectivePanelSnapshot({
  globalPanel,
  pagePatches,
  pageVisibility,
  flowId,
  pageId,
  // legacy — ignored
  presets: _presets,
  routing: _routing,
}) {
  const storedPatch = pagePatches?.[pagePatchKey(flowId, pageId)] ?? null;

  const merged = mergePanelLayers(globalPanel, storedPatch);

  if (!merged) return null;

  const slim = preparePanelConfigForSave(merged);
  const vis = pageVisibility
    ? getPageVisibility({ pageVisibility }, flowId, pageId)
    : { hiddenGroups: [], hiddenCategories: [] };
  return applyVisibility(slim, vis);
}

export function setPagePreset(routing, flowId, pageId, presetId) {
  const site = routing?.[flowId] ?? { default: DEFAULT_PRESET_ID, pages: {} };
  const siteDefault = site.default ?? DEFAULT_PRESET_ID;

  const nextPages = { ...(site.pages ?? {}) };
  if (presetId === siteDefault) {
    delete nextPages[pageId];
  } else {
    nextPages[pageId] = presetId;
  }

  return {
    ...routing,
    [flowId]: { ...site, pages: nextPages },
  };
}

export function setSiteDefaultPreset(routing, flowId, presetId) {
  const site = routing?.[flowId] ?? { default: DEFAULT_PRESET_ID, pages: {} };
  return {
    ...routing,
    [flowId]: { ...site, default: presetId },
  };
}

export function setPagePatch(pagePatches, flowId, pageId, patch) {
  const key = pagePatchKey(flowId, pageId);
  return { ...pagePatches, [key]: patch };
}

export function ensurePanelState(session) {
  if (session?.panelState?.version >= PANEL_STATE_VERSION) {
    return session;
  }
  const panelState = {
    ...createDefaultPanelState(),
    ...(session?.panelState ?? {}),
    version: PANEL_STATE_VERSION,
    pageVisibility: session?.panelState?.pageVisibility ?? {},
  };
  return { ...session, panelState };
}

/** One-time migration: legacy flowPanels → pagePatches; merge PanelConfig rows. */
export function migrateLegacyFlowPanels(session, legacyFlowPanels) {
  const withState = ensurePanelState(session);
  const panelState = { ...withState.panelState };

  for (const [flowId, pages] of Object.entries(legacyFlowPanels ?? {})) {
    if (pages?.[GLOBAL_PANEL_PAGE_ID]) {
      panelState.globalPanel = pages[GLOBAL_PANEL_PAGE_ID];
    }
    for (const [pageId, config] of Object.entries(pages ?? {})) {
      if (!config || pageId === GLOBAL_PANEL_PAGE_ID) continue;
      const key = pagePatchKey(flowId, pageId);
      panelState.pagePatches[key] = config;
    }
  }

  return { ...withState, panelState };
}

export function patchPanelState(session, panelState) {
  return { ...session, panelState };
}

/** Strip heavy page patches from session blob — panels live in PanelConfig rows. */
export function panelStateForRemoteSync(panelState) {
  if (!panelState) return panelState;
  return {
    ...panelState,
    pagePatches: {},
    pagePatchKeys: Object.keys(panelState.pagePatches ?? {}),
  };
}

export function listPresets(panelState) {
  return Object.values(panelState?.presets ?? STARTER_PRESETS);
}

export const PANEL_EDIT_SCOPES = {
  GLOBAL: 'global',
  PRESET: 'preset',
  PAGE: 'page',
};

export function getSiteDefaultPresetId(routing, flowId) {
  return routing?.[flowId]?.default ?? DEFAULT_PRESET_ID;
}

/** Panel snapshot for edit mode — no visibility filter (editor shows all groups). */
export function resolvePanelForEditScope(panelState, { flowId, pageId, scope, presetId: _presetId }) {
  if (!panelState) return null;

  if (scope === PANEL_EDIT_SCOPES.GLOBAL) {
    return panelState.globalPanel ?? null;
  }

  const pagePatch = getPagePatch(panelState.pagePatches, flowId, pageId);
  return mergePanelLayers(panelState.globalPanel, pagePatch) ?? null;
}

/** Write a saved panel payload to the correct layer for the edit scope. */
export function applyPanelSaveForScope(panelState, { flowId, pageId, scope, presetId, slim }) {
  const base = panelState ?? createDefaultPanelState();

  if (scope === PANEL_EDIT_SCOPES.GLOBAL) {
    return { ...base, globalPanel: slim };
  }

  if (scope === PANEL_EDIT_SCOPES.PRESET) {
    const id = presetId ?? DEFAULT_PRESET_ID;
    const preset = base.presets?.[id] ?? { id, name: id, hiddenGroups: [], hiddenCategories: [], overrides: {} };
    return {
      ...base,
      presets: {
        ...base.presets,
        [id]: { ...preset, overrides: slim },
      },
    };
  }

  return {
    ...base,
    pagePatches: setPagePatch(base.pagePatches ?? {}, flowId, pageId, slim),
  };
}

export function updatePresetVisibility(presets, presetId, { hiddenGroups, hiddenCategories }) {
  const preset = presets?.[presetId];
  if (!preset) return presets;
  return {
    ...presets,
    [presetId]: {
      ...preset,
      hiddenGroups: hiddenGroups ?? preset.hiddenGroups ?? [],
      hiddenCategories: hiddenCategories ?? preset.hiddenCategories ?? [],
    },
  };
}

export function toggleListItem(list, id) {
  const set = new Set(list ?? []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

function slugPresetId(name, presets) {
  const base = String(name ?? 'preset')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'preset';
  let id = base;
  let n = 2;
  while (presets[id]) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export function renamePreset(presets, presetId, newName) {
  const trimmed = newName?.trim();
  const preset = presets?.[presetId];
  if (!trimmed || !preset) return presets;
  return {
    ...presets,
    [presetId]: { ...preset, name: trimmed },
  };
}

export function duplicatePreset(presets, sourceId, name) {
  const source = presets?.[sourceId];
  if (!source) return { presets, newId: null };
  const newName = name?.trim() || `${source.name} copy`;
  const newId = slugPresetId(newName, presets);
  return {
    newId,
    presets: {
      ...presets,
      [newId]: {
        ...source,
        id: newId,
        name: newName,
        overrides: source.overrides ? { ...source.overrides } : {},
        hiddenGroups: [...(source.hiddenGroups ?? [])],
        hiddenCategories: [...(source.hiddenCategories ?? [])],
      },
    },
  };
}

export function createPresetFromSource(presets, name, sourceId = DEFAULT_PRESET_ID) {
  return duplicatePreset(presets, sourceId, name);
}

export function clearPagePresetOverride(routing, flowId, pageId) {
  const site = routing?.[flowId];
  if (!site?.pages?.[pageId]) return routing;
  const nextPages = { ...site.pages };
  delete nextPages[pageId];
  return { ...routing, [flowId]: { ...site, pages: nextPages } };
}
