import { isBase44Backend } from './backend.js';
import {
  createPanelConfigRow,
  filterActivePanelConfig,
  updatePanelConfigRow,
  withTimeout,
} from './base44Api.js';
import {
  loadPanelConfigLocal,
  mergePanelConfigFromSave,
  panelConfigByteSize,
  PANEL_CONFIG_MAX_CHARS,
  preparePanelConfigForSave,
  savePanelConfigLocal,
} from './panelConfigSerialize.js';
import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';
import { buildDefaultGroups, normalizePanelGroups } from '../panelConfig/panelStructure.js';
import { initAllGroupLayouts } from '../panelConfig/initGroupLayouts.js';
import { createDefaultGroupLayoutState } from '../panelConfig/panelZones.js';
import { loadInitialTemplates } from '../layoutBuilder/builder/mockData';

const ACTIVE_NAME = 'default';

function expandSavedRow(row) {
  if (!row?.config_json) return null;
  try {
    return JSON.parse(row.config_json);
  } catch {
    return null;
  }
}

export async function loadPanelConfig() {
  let saved = null;

  if (isBase44Backend()) {
    try {
      const rows = await filterActivePanelConfig();
      if (rows.length) saved = expandSavedRow(rows[0]);
    } catch (err) {
      console.warn('[panelConfig] Base44 load failed', err);
    }
  }

  if (!saved?.categories?.length) {
    saved = loadPanelConfigLocal();
  }

  if (!saved?.categories?.length) return null;

  const defaultTemplates = await loadInitialTemplates();
  const categories = DEFAULT_CATEGORIES;
  const groups = buildDefaultGroups(categories);

  return mergePanelConfigFromSave(saved, {
    categories,
    groups,
    defaultTemplates,
    createLayoutState: (grps, templates) =>
      initAllGroupLayouts(grps, templates, createDefaultGroupLayoutState),
  });
}

export async function savePanelConfig(config) {
  const slim = preparePanelConfigForSave(config);
  const size = panelConfigByteSize(slim);

  savePanelConfigLocal(slim);

  if (size > PANEL_CONFIG_MAX_CHARS) {
    const err = new Error(
      `Panel config too large (${size} chars, max ${PANEL_CONFIG_MAX_CHARS}). `
      + 'Remove unused seeded layouts or large uploaded images.',
    );
    err.code = 'PANEL_CONFIG_TOO_LARGE';
    err.size = size;
    throw err;
  }

  if (!isBase44Backend()) {
    return { id: null, storage: 'local', size };
  }

  const payload = {
    name: slim.layoutName || ACTIVE_NAME,
    version: slim.version || 'panel-edit-6',
    is_active: true,
    config_json: JSON.stringify(slim),
  };

  const existing = await filterActivePanelConfig();
  if (existing.length) {
    await updatePanelConfigRow(existing[0].id, payload);
    return { id: existing[0].id, storage: 'base44', size };
  }

  const created = await createPanelConfigRow(payload);
  return { id: created.id, storage: 'base44', size };
}

/** Normalize groups from a raw saved blob (panel edit init) */
export function hydratePanelConfigFromRaw(saved, loadedTemplates) {
  if (!saved?.categories?.length) return null;
  const categories = saved.categories;
  const groups = normalizePanelGroups(saved.groups ?? buildDefaultGroups(categories));
  const merged = mergePanelConfigFromSave(
    { ...saved, groups },
    {
      categories,
      groups,
      defaultTemplates: loadedTemplates,
      createLayoutState: (grps, templates) =>
        initAllGroupLayouts(grps, templates, createDefaultGroupLayoutState),
    },
  );
  return { ...merged, groups: normalizePanelGroups(merged.groups) };
}

/** Build a save payload from live panel edit state */
export function buildPanelEditPayload({
  layoutName = '',
  categories = [],
  groups = [],
  templates = [],
  groupLayouts = {},
}) {
  return {
    version: 'panel-edit-6',
    layoutName,
    categories,
    groups,
    templates,
    groupLayouts,
  };
}
