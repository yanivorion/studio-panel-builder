import { applyPreset } from '../layoutBuilder/builder/gridEngine';
import { relayoutCollageState } from '../panelConfig/collageRelayout.js';
import { relayoutGridMasonryState } from '../panelConfig/gridRelayout.js';
import { createDefaultGroupLayoutState } from '../panelConfig/panelZones.js';

/** Ensure every saved layout has a valid gridEngine.breakpoints array. */
export function normalizeGroupLayout(layout) {
  const defaults = createDefaultGroupLayoutState();
  if (!layout) return defaults;

  const defaultBps = defaults.gridEngine.breakpoints;
  const savedBps = layout.gridEngine?.breakpoints;
  const mergedBps = (savedBps?.length ? savedBps : defaultBps).map((bp, i) => {
    const def = defaultBps.find(d => d.key === bp.key) ?? defaultBps[i] ?? defaultBps[0];
    return {
      ...def,
      ...bp,
      gridConfig: { ...def.gridConfig, ...(bp.gridConfig ?? {}) },
      items: bp.items ?? [],
    };
  });

  return {
    ...defaults,
    ...layout,
    gridEngine: {
      ...defaults.gridEngine,
      ...(layout.gridEngine ?? {}),
      breakpoints: mergedBps,
    },
    orderedTemplateIds: layout.orderedTemplateIds ?? defaults.orderedTemplateIds,
    activeBreakpointKey: layout.activeBreakpointKey ?? defaults.activeBreakpointKey,
    templateScales: layout.templateScales ?? {},
    templateObjectFit: layout.templateObjectFit ?? {},
    templatePadding: layout.templatePadding ?? {},
    templateBadges: layout.templateBadges ?? {},
  };
}

export function normalizeAllGroupLayouts(groupLayouts = {}) {
  const next = {};
  Object.entries(groupLayouts).forEach(([key, layout]) => {
    next[key] = isUltraCompactLayout(layout)
      ? expandUltraCompactLayout(layout)
      : normalizeGroupLayout(layout);
  });
  return next;
}

export function isUltraCompactLayout(layout) {
  return layout?.v === 1 && layout?.bps != null && !layout?.gridEngine;
}

function snapshotBreakpoint(bp) {
  const snap = {};
  if (bp.presetId) snap.p = bp.presetId;
  if (bp.galleryLayout) snap.g = bp.galleryLayout;
  if (bp.compactor) snap.c = bp.compactor;
  if (bp.collageSettings) snap.cs = bp.collageSettings;
  if (bp.flexSettings) snap.fs = bp.flexSettings;
  if (bp.gridConfig) {
    const gc = {};
    if (bp.gridConfig.cols != null) gc.o = bp.gridConfig.cols;
    if (bp.gridConfig.rowHeight != null) gc.r = bp.gridConfig.rowHeight;
    if (bp.gridConfig.margin) gc.m = bp.gridConfig.margin;
    if (Object.keys(gc).length) snap.gc = gc;
  }
  return snap;
}

export function ultraCompactLayoutForSave(layout) {
  const normalized = normalizeGroupLayout(layout);
  const bps = {};
  normalized.gridEngine.breakpoints.forEach(bp => {
    bps[bp.key] = snapshotBreakpoint(bp);
  });

  const out = {
    v: 1,
    ls: normalized.layoutSeeded ? 1 : 0,
    ids: normalized.orderedTemplateIds ?? [],
    bk: normalized.activeBreakpointKey ?? 'bp-narrow',
    bps,
  };

  if (normalized.containerPadding !== 12) out.cp = normalized.containerPadding;
  if (normalized.itemPaddingX !== 8) out.px = normalized.itemPaddingX;
  if (normalized.itemPaddingY !== 8) out.py = normalized.itemPaddingY;
  if (normalized.itemBorderRadius !== 10) out.br = normalized.itemBorderRadius;
  if (Object.keys(normalized.templateScales ?? {}).length) out.ts = normalized.templateScales;
  if (Object.keys(normalized.templateObjectFit ?? {}).length) out.tof = normalized.templateObjectFit;
  if (Object.keys(normalized.templatePadding ?? {}).length) out.tp = normalized.templatePadding;
  if (Object.keys(normalized.templateBadges ?? {}).length) out.tb = normalized.templateBadges;
  return out;
}

export function expandUltraCompactLayout(compact) {
  if (!isUltraCompactLayout(compact)) return normalizeGroupLayout(compact);

  const state = createDefaultGroupLayoutState();
  state.layoutSeeded = compact.ls === 1;
  state.orderedTemplateIds = compact.ids ?? [];
  state.activeBreakpointKey = compact.bk ?? 'bp-narrow';
  state.containerPadding = compact.cp ?? 12;
  state.itemPaddingX = compact.px ?? 8;
  state.itemPaddingY = compact.py ?? 8;
  state.itemBorderRadius = compact.br ?? 10;
  state.templateScales = compact.ts ?? {};
  state.templateObjectFit = compact.tof ?? {};
  state.templatePadding = compact.tp ?? {};
  state.templateBadges = compact.tb ?? {};

  state.gridEngine.breakpoints = state.gridEngine.breakpoints.map(bp => {
    const snap = compact.bps?.[bp.key] ?? {};
    return {
      ...bp,
      presetId: snap.p ?? bp.presetId,
      galleryLayout: snap.g ?? bp.galleryLayout,
      compactor: snap.c ?? bp.compactor,
      collageSettings: snap.cs ?? bp.collageSettings,
      flexSettings: snap.fs ?? bp.flexSettings,
      gridConfig: snap.gc
        ? {
            ...bp.gridConfig,
            cols: snap.gc.o ?? bp.gridConfig.cols,
            rowHeight: snap.gc.r ?? bp.gridConfig.rowHeight,
            margin: snap.gc.m ?? bp.gridConfig.margin,
          }
        : bp.gridConfig,
      items: [],
    };
  });
  return state;
}

/**
 * Grid item positions are recomputable from presetId + orderedTemplateIds.
 * Stripping them keeps panel JSON small enough for Base44 while keeping images as URLs.
 */
export function compactLayoutForSave(layout) {
  const normalized = normalizeGroupLayout(layout);
  if (!normalized?.gridEngine?.breakpoints) return normalized;

  return {
    ...normalized,
    gridEngine: {
      ...normalized.gridEngine,
      breakpoints: normalized.gridEngine.breakpoints.map(bp => {
        if (!bp.items?.length) return bp;
        const { items, ...rest } = bp;
        return { ...rest, _itemsStripped: true };
      }),
    },
  };
}

function expandLayoutBreakpoint(state, bpKey, templates, templatesById, canvasWidth) {
  const bp = state.gridEngine?.breakpoints?.find(b => b.key === bpKey);
  if (!bp) return state;
  if (bp.items?.length && !bp._itemsStripped) return state;

  const withKey = { ...state, activeBreakpointKey: bpKey };

  if (bp.galleryLayout === 'Collage') {
    return relayoutCollageState(withKey, templatesById, canvasWidth);
  }
  if (bp.galleryLayout === 'Grid' || bp.galleryLayout === 'Masonry') {
    return relayoutGridMasonryState(withKey, templates, canvasWidth);
  }

  const ids = state.orderedTemplateIds ?? [];
  const presetId = bp.presetId;
  if (!presetId || !ids.length) return state;

  const cols = bp.gridConfig?.cols ?? 6;
  const collageParams = presetId.includes('collage') || bp.galleryLayout === 'Collage'
    ? {
        containerWidth: canvasWidth,
        gap: bp.gridConfig?.margin?.[0] ?? 12,
        paddingX: state.itemPaddingX ?? 8,
        paddingY: state.itemPaddingY ?? 8,
        settings: bp.collageSettings ?? { targetRowHeight: 200, minItemSize: 80, groupPattern: '' },
        templateScales: state.templateScales ?? {},
      }
    : undefined;

  const result = applyPreset(
    presetId,
    templates,
    ids,
    cols,
    collageParams,
    {
      containerWidth: canvasWidth,
      gap: bp.gridConfig?.margin?.[0] ?? 12,
      rowHeight: bp.gridConfig?.rowHeight ?? 80,
    },
  );

  return {
    ...withKey,
    gridEngine: {
      ...withKey.gridEngine,
      breakpoints: withKey.gridEngine.breakpoints.map(b =>
        b.key === bpKey
          ? {
              ...b,
              items: result.items,
              galleryLayout: result.galleryLayout ?? b.galleryLayout,
              _itemsStripped: undefined,
            }
          : b,
      ),
    },
  };
}

/** Restore grid items stripped during save. */
export function expandGroupLayouts(groupLayouts, templates, canvasWidth = 440) {
  if (!groupLayouts) return {};

  const normalized = normalizeAllGroupLayouts(groupLayouts);
  if (!templates?.length) return normalized;

  const templatesById = Object.fromEntries(templates.filter(t => t?.id).map(t => [t.id, t]));
  const next = {};

  for (const [key, layout] of Object.entries(normalized)) {
    const needsExpand = layout.gridEngine.breakpoints.some(
      bp => bp._itemsStripped || (!bp.items?.length && (bp.presetId || bp.galleryLayout)),
    );

    if (!needsExpand) {
      next[key] = layout;
      continue;
    }

    let state = layout;
    for (const bp of layout.gridEngine.breakpoints) {
      state = expandLayoutBreakpoint(state, bp.key, templates, templatesById, canvasWidth);
    }

    next[key] = {
      ...state,
      gridEngine: {
        ...state.gridEngine,
        breakpoints: state.gridEngine.breakpoints.map(({ _itemsStripped, ...bp }) => bp),
      },
    };
  }

  return next;
}

export function compactGroupLayouts(groupLayouts = {}) {
  const slim = {};
  Object.entries(groupLayouts).forEach(([key, layout]) => {
    if (layout) slim[key] = ultraCompactLayoutForSave(layout);
  });
  return slim;
}
