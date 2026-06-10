import { mergeDefaultPanelStructure } from '../panelConfig/panelStructure.js';
import { mergeCategoryGroupsIntoLayouts } from '../panelConfig/categoryGroupDefaults.js';
import { createDefaultGroupLayoutState } from '../panelConfig/panelZones.js';
import { mergeContainerSlotTemplatesIntoCatalog } from '../panelConfig/containerGroupDefaults.js';
import { compactGroupLayouts, expandGroupLayouts, normalizeAllGroupLayouts } from './panelLayoutCompact.js';

/** Base44 entity field limit — keep inline JSON under this size */
export const PANEL_CONFIG_MAX_CHARS = 18_000;

const LOCAL_STORAGE_KEY = 'studio-panel-config-v2';

/** Default built-in panel assets — reloaded from seed, not persisted */
export function isDefaultPanelTemplate(t) {
  return t?.src?.startsWith('/panel/') && /^tpl-/.test(t?.id ?? '');
}

export function isLayoutDirty(layout) {
  if (!layout) return false;
  if (layout.layoutSeeded) return true;
  if (Object.keys(layout.templateBadges ?? {}).length > 0) return true;
  if (layout.orderedTemplateIds?.length) return true;
  if (layout.containerPadding != null && layout.containerPadding !== 12) return true;
  if (layout.itemPaddingX != null && layout.itemPaddingX !== 8) return true;
  if (layout.itemPaddingY != null && layout.itemPaddingY !== 8) return true;
  if (layout.itemBorderRadius != null && layout.itemBorderRadius !== 10) return true;
  if (Object.keys(layout.templateScales ?? {}).length) return true;
  if (Object.keys(layout.templateObjectFit ?? {}).length) return true;
  if (Object.keys(layout.templatePadding ?? {}).length) return true;
  const bp = layout.gridEngine?.breakpoints ?? [];
  if (bp.some(b => (b.items?.length ?? 0) > 0)) return true;
  return false;
}

export function slimGroupLayouts(groupLayouts = {}) {
  const slim = {};
  Object.entries(groupLayouts).forEach(([key, layout]) => {
    if (isLayoutDirty(layout)) slim[key] = layout;
  });
  return compactGroupLayouts(slim);
}

/** Persist only user-uploaded / non-default templates (never inline data URLs) */
export function slimTemplates(templates = []) {
  return templates
    .filter(t => !isDefaultPanelTemplate(t))
    .map(t => {
      if (t.src?.startsWith('data:')) {
        return {
          id: t.id,
          name: t.name,
          width: t.width,
          height: t.height,
          src: '',
          _pendingDataUrl: true,
        };
      }
      return t;
    });
}

export function preparePanelConfigForSave(config) {
  return {
    version: config.version || 'panel-edit-6',
    layoutName: config.layoutName || '',
    categories: config.categories ?? [],
    groups: config.groups ?? [],
    customTemplates: slimTemplates(config.templates ?? []),
    groupLayouts: slimGroupLayouts(config.groupLayouts ?? {}),
  };
}

export function mergePanelConfigFromSave(saved, { categories, groups, defaultTemplates, createLayoutState }) {
  const merged = mergeDefaultPanelStructure(saved?.categories, saved?.groups);
  const cats = merged.categories;
  const grps = merged.groups;
  const customTemplates = saved?.customTemplates ?? saved?.templates ?? [];
  const defaultIds = new Set((defaultTemplates ?? []).map(t => t.id));
  const templates = mergeContainerSlotTemplatesIntoCatalog(grps, [
    ...(defaultTemplates ?? []),
    ...customTemplates.filter(t => t?.id && !defaultIds.has(t.id) && t.src && !t._pendingDataUrl),
  ]);

  const defaultLayouts = createLayoutState(grps, templates);
  const savedLayouts = normalizeAllGroupLayouts(saved?.groupLayouts ?? {});
  const groupLayouts = expandGroupLayouts(
    mergeCategoryGroupsIntoLayouts(
      grps,
      templates,
      {
        ...defaultLayouts,
        ...savedLayouts,
      },
      createDefaultGroupLayoutState,
    ),
    templates,
  );

  return {
    categories: cats,
    groups: grps,
    templates,
    groupLayouts,
    layoutName: saved?.layoutName ?? '',
  };
}

export function savePanelConfigLocal(config) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch {
    return false;
  }
}

export function loadPanelConfigLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function panelConfigByteSize(config) {
  return JSON.stringify(preparePanelConfigForSave(config)).length;
}

/** True when JSON is a panel layout file (not a full studio session). */
export function isPanelConfigOnlyJson(raw) {
  if (!raw || typeof raw !== 'object') return false;
  if (raw.session || raw.flows || raw.panelState) return false;
  return Array.isArray(raw.categories) || Array.isArray(raw.groups);
}

/** Normalize a downloaded / uploaded panel JSON for the editor. */
export function parsePanelConfigImport(raw) {
  if (!isPanelConfigOnlyJson(raw)) {
    throw new Error('Not a panel layout file — expected categories and groups');
  }
  return {
    version: raw.version || 'panel-edit-6',
    layoutName: raw.layoutName || '',
    categories: raw.categories ?? [],
    groups: raw.groups ?? [],
    templates: raw.templates ?? raw.customTemplates ?? [],
    groupLayouts: raw.groupLayouts ?? {},
  };
}
