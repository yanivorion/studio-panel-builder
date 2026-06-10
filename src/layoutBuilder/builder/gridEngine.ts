import {
  BreakpointFluidity,
  CollageSettings,
  FlexSettings,
  GridLayoutItem,
  LayoutBreakpoint,
  TemplateAsset,
} from './types';
import {
  applyGroupPattern,
  collageTileRowsToItems,
  packTilesIntoRows,
  parseGroupPattern,
} from './collageUtils';

export const DEFAULT_FLUIDITY: BreakpointFluidity = {
  withinBreakpoint: 'static',
  structuralMode: 'fixed',
  minTileWidthPx: 120,
  maxTileWidthPx: 420,
  minCols: 2,
  maxCols: 12,
  rowHeightPx: 120,
};

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const makeLayoutItem = (id: string, index: number, cols: number): GridLayoutItem => ({
  i: id,
  x: index % cols,
  y: Math.floor(index / cols),
  w: 1,
  h: 1,
});

const generateGridPreset = (templateIds: string[], cols: number): GridLayoutItem[] =>
  templateIds.map((id, index) => makeLayoutItem(id, index, cols));

const generateMasonryPreset = (
  templates: TemplateAsset[],
  templateIds: string[],
  cols: number,
  containerWidth: number,
  gap: number,
  rowHeight: number,
): GridLayoutItem[] => {
  const colWidth = (containerWidth - (cols + 1) * gap) / Math.max(1, cols);
  // Track the current height (in grid rows) of each column for true masonry placement
  const colHeights = new Array(cols).fill(0) as number[];

  return templateIds.map((id) => {
    const template = templates.find((item) => item.id === id);
    const ratio = template ? template.height / Math.max(1, template.width) : 1;
    const h = clamp(Math.round((ratio * colWidth) / Math.max(1, rowHeight)), 1, 10);

    // Place in the shortest column
    const col = colHeights.indexOf(Math.min(...colHeights));
    const y = colHeights[col];
    colHeights[col] += h;

    return { i: id, x: col, y, w: 1, h };
  });
};

const generateMosaicHeroLeft = (templateIds: string[], cols: number): GridLayoutItem[] =>
  templateIds.map((id, index) => {
    if (index === 0) {
      return { i: id, x: 0, y: 0, w: Math.min(6, cols), h: 4 };
    }
    const localIndex = index - 1;
    const x = Math.min(6, cols) + (localIndex % Math.max(1, cols - Math.min(6, cols)));
    const y = Math.floor(localIndex / Math.max(1, cols - Math.min(6, cols))) * 2;
    return { i: id, x, y, w: 1, h: 2 };
  });

const generatePattern2h2v2h = (templateIds: string[], cols: number): GridLayoutItem[] => {
  const items: GridLayoutItem[] = [];
  let cursorY = 0;
  let pointer = 0;
  while (pointer < templateIds.length) {
    const first = templateIds[pointer++];
    if (first) {
      items.push({ i: first, x: 0, y: cursorY, w: Math.max(1, Math.floor(cols / 2)), h: 2 });
    }
    const second = templateIds[pointer++];
    if (second) {
      items.push({
        i: second,
        x: Math.max(1, Math.floor(cols / 2)),
        y: cursorY,
        w: Math.max(1, Math.ceil(cols / 2)),
        h: 3,
      });
    }
    const third = templateIds[pointer++];
    if (third) {
      items.push({
        i: third,
        x: 0,
        y: cursorY + 2,
        w: Math.max(1, Math.floor(cols / 2)),
        h: 1,
      });
    }
    cursorY += 3;
  }
  return items;
};

const generateStrip = (templateIds: string[]): GridLayoutItem[] =>
  templateIds.map((id, index) => ({
    i: id,
    x: index * 2,
    y: 0,
    w: 2,
    h: 1,
    minW: 1,
    minH: 1,
  }));

/**
 * Collage row seeding — fixed pattern mode.
 * Distributes ids into rows following a repeating column-count pattern.
 * e.g. pattern [3] → all rows of 3
 *      pattern [1, 2, 3] → hero row of 1, then 2, then 3, repeating
 */
export const seedCollageRows = (ids: string[], pattern: number[]): GridLayoutItem[] => {
  const items: GridLayoutItem[] = [];
  let idx = 0;
  let rowIdx = 0;
  while (idx < ids.length) {
    const n = pattern[rowIdx % pattern.length];
    const slice = ids.slice(idx, idx + n);
    slice.forEach((id, ci) => items.push({ i: id, x: ci, y: rowIdx, w: 1, h: 1 }));
    idx += slice.length;
    rowIdx++;
  }
  return items;
};

export const DEFAULT_COLLAGE_SETTINGS: CollageSettings = {
  targetRowHeight: 200,
  minItemSize: 80,
  groupPattern: '',
};

export const DEFAULT_FLEX_SETTINGS: FlexSettings = {
  minItemWidth: 100,
  maxItemWidth: 240,
  itemHeight: 80,
  scrollable: true,
};

/**
 * Auto-seed collage rows using targetRowHeight / minItemSize constraints
 * and an optional groupPattern string (e.g. "2h,2v,3l").
 *
 * Algorithm:
 *   1. Apply groupPattern to ids → flat CollageTile[] (cycling through the pattern)
 *   2. Pack tiles into rows using the target/min constraints
 *   3. Convert CollageTile[][] → GridLayoutItem[]
 */
export const autoSeedCollageRows = (
  ids: string[],
  templatesById: Record<string, TemplateAsset>,
  containerWidth: number,
  gap: number,
  paddingX: number,
  paddingY: number,
  settings: CollageSettings,
  templateScales: Record<string, number> = {},
): GridLayoutItem[] => {
  const pattern = parseGroupPattern(settings.groupPattern || '1');
  const tiles = applyGroupPattern(ids, pattern);
  const rows = packTilesIntoRows(
    tiles, templatesById, templateScales,
    containerWidth, gap, paddingX, paddingY, settings,
  );
  return collageTileRowsToItems(rows);
};

export const PRESET_OPTIONS = [
  { id: 'default', label: 'Default', category: 'default' },
  { id: 'grid-1', label: '1 column', category: 'grid' },
  { id: 'grid-2', label: '2 columns', category: 'grid' },
  { id: 'grid-3', label: '3 columns', category: 'grid' },
  { id: 'grid-4', label: '4 columns', category: 'grid' },
  { id: 'grid-5', label: '5 columns', category: 'grid' },
  { id: 'grid-6', label: '6 columns', category: 'grid' },
  { id: 'masonry-1', label: '1 column', category: 'masonry' },
  { id: 'masonry-2', label: '2 columns', category: 'masonry' },
  { id: 'masonry-3', label: '3 columns', category: 'masonry' },
  { id: 'masonry-4', label: '4 columns', category: 'masonry' },
  { id: 'masonry-5', label: '5 columns', category: 'masonry' },
  { id: 'collage-auto', label: 'Auto (target + min size)', category: 'collage' },
  { id: 'collage-rows-3', label: 'Rows of 3', category: 'collage' },
  { id: 'collage-rows-2', label: 'Rows of 2', category: 'collage' },
  { id: 'collage-mixed', label: '1 · 2 · 3 mixed', category: 'collage' },
  { id: 'collage-2h-2v', label: '2h · 2v pattern', category: 'collage' },
  { id: 'strip-horizontal', label: 'Horizontal Strip', category: 'strip' },
];

export const applyPreset = (
  presetId: string,
  templates: TemplateAsset[],
  templateIds: string[],
  fallbackCols: number,
  collageAutoParams?: {
    containerWidth: number;
    gap: number;
    paddingX: number;
    paddingY: number;
    settings: CollageSettings;
    templateScales?: Record<string, number>;
  },
  rglParams?: {
    containerWidth: number;
    gap: number;
    rowHeight: number;
  },
): { items: GridLayoutItem[]; cols?: number; rowHeight?: number; galleryLayout?: LayoutBreakpoint['galleryLayout'] } => {
  const cw  = rglParams?.containerWidth ?? 600;
  const gap = rglParams?.gap           ?? 12;
  const rh  = rglParams?.rowHeight     ?? 80;
  switch (presetId) {
    case 'grid-1': {
      const colW1 = Math.max(60, Math.round(cw - 2 * gap));
      return { items: generateGridPreset(templateIds, 1), cols: 1, rowHeight: colW1, galleryLayout: 'Grid' };
    }
    case 'grid-2': {
      // Row height = col width → ~square cells
      const colW2 = Math.max(60, Math.round((cw - 3 * gap) / 2));
      return { items: generateGridPreset(templateIds, 2), cols: 2, rowHeight: colW2, galleryLayout: 'Grid' };
    }
    case 'grid-3': {
      const colW3 = Math.max(60, Math.round((cw - 4 * gap) / 3));
      return { items: generateGridPreset(templateIds, 3), cols: 3, rowHeight: colW3, galleryLayout: 'Grid' };
    }
    case 'grid-4': {
      const colW4 = Math.max(60, Math.round((cw - 5 * gap) / 4));
      return { items: generateGridPreset(templateIds, 4), cols: 4, rowHeight: colW4, galleryLayout: 'Grid' };
    }
    case 'grid-5': {
      const colW5 = Math.max(50, Math.round((cw - 6 * gap) / 5));
      return { items: generateGridPreset(templateIds, 5), cols: 5, rowHeight: colW5, galleryLayout: 'Grid' };
    }
    case 'grid-6': {
      const colW6 = Math.max(40, Math.round((cw - 7 * gap) / 6));
      return { items: generateGridPreset(templateIds, 6), cols: 6, rowHeight: colW6, galleryLayout: 'Grid' };
    }
    case 'masonry-1':
      return {
        items: generateMasonryPreset(templates, templateIds, 1, cw, gap, rh),
        cols: 1,
        galleryLayout: 'Masonry',
      };
    case 'masonry-2':
      return {
        items: generateMasonryPreset(templates, templateIds, 2, cw, gap, rh),
        cols: 2,
        galleryLayout: 'Masonry',
      };
    case 'masonry-3':
      return {
        items: generateMasonryPreset(templates, templateIds, 3, cw, gap, rh),
        cols: 3,
        galleryLayout: 'Masonry',
      };
    case 'masonry-4':
      return {
        items: generateMasonryPreset(templates, templateIds, 4, cw, gap, rh),
        cols: 4,
        galleryLayout: 'Masonry',
      };
    case 'masonry-5':
      return {
        items: generateMasonryPreset(templates, templateIds, 5, cw, gap, rh),
        cols: 5,
        galleryLayout: 'Masonry',
      };
    case 'mosaic-hero-left':
      return {
        items: generateMosaicHeroLeft(templateIds, Math.max(6, fallbackCols)),
        cols: Math.max(6, fallbackCols),
        galleryLayout: 'Collage',
      };
    case 'mosaic-2h-2v-2h':
      return {
        items: generatePattern2h2v2h(templateIds, Math.max(6, fallbackCols)),
        cols: Math.max(6, fallbackCols),
        galleryLayout: 'Collage',
      };
    // ── Collage auto-seed ──────────────────────────────────────────────
    case 'collage-auto': {
      const templatesById = templates.reduce<Record<string, TemplateAsset>>(
        (acc, t) => { acc[t.id] = t; return acc; }, {},
      );
      const p = collageAutoParams;
      const items = p
        ? autoSeedCollageRows(
            templateIds, templatesById,
            p.containerWidth, p.gap, p.paddingX, p.paddingY,
            p.settings, p.templateScales,
          )
        : seedCollageRows(templateIds, [3]);
      return { items, galleryLayout: 'Collage' };
    }
    // ── Collage row presets (use seedCollageRows, not RGL grid coords) ──
    case 'collage-rows-3':
      return { items: seedCollageRows(templateIds, [3]), galleryLayout: 'Collage' };
    case 'collage-rows-2':
      return { items: seedCollageRows(templateIds, [2]), galleryLayout: 'Collage' };
    case 'collage-mixed':
      return { items: seedCollageRows(templateIds, [1, 2, 3]), galleryLayout: 'Collage' };
    case 'collage-2h-2v':
      return { items: seedCollageRows(templateIds, [2, 2]), galleryLayout: 'Collage' };
    case 'strip-horizontal':
      return { items: generateStrip(templateIds), cols: Math.max(8, fallbackCols), rowHeight: 80, galleryLayout: 'Flex' };
    case 'default':
    default:
      return { items: seedCollageRows(templateIds, [3]), galleryLayout: 'Collage' };
  }
};

export const resolveBreakpointByWidth = (
  breakpoints: LayoutBreakpoint[],
  width: number,
): LayoutBreakpoint => {
  const sorted = [...breakpoints].sort((a, b) => b.minWidth - a.minWidth);
  return sorted.find((bp) => width >= bp.minWidth) ?? sorted[sorted.length - 1];
};

export const createDefaultBreakpoint = (
  key: string,
  label: string,
  minWidth: number,
  templateIds: string[],
): LayoutBreakpoint => ({
  key,
  label,
  minWidth,
  galleryLayout: 'Collage',
  placement: 'manual',
  gridConfig: { cols: 12, rowHeight: 80, margin: [12, 12] },
  compactor: 'none',
  items: seedCollageRows(templateIds, [3]),
  presetId: 'collage-rows-3',
  fluidity: { ...DEFAULT_FLUIDITY },
  collageSettings: { ...DEFAULT_COLLAGE_SETTINGS },
  flexSettings: { ...DEFAULT_FLEX_SETTINGS },
});

export const normalizeLayoutItems = (
  currentItems: GridLayoutItem[],
  orderedIds: string[],
  cols: number,
): GridLayoutItem[] => {
  const byId = new Map(currentItems.map((item) => [item.i, item]));
  const next: GridLayoutItem[] = [];
  orderedIds.forEach((id, index) => {
    const existing = byId.get(id);
    if (existing) {
      next.push({ ...existing });
    } else {
      next.push(makeLayoutItem(id, index, cols));
    }
  });
  return next;
};

export const withEffectiveGridConfig = (
  breakpoint: LayoutBreakpoint,
  panelWidth: number,
): LayoutBreakpoint['gridConfig'] => {
  const { fluidity } = breakpoint;
  if (fluidity.withinBreakpoint === 'static') {
    return breakpoint.gridConfig;
  }

  if (fluidity.structuralMode === 'widthOnly') {
    const cols = clamp(
      Math.floor(panelWidth / Math.max(1, fluidity.minTileWidthPx)),
      fluidity.minCols,
      fluidity.maxCols,
    );
    return {
      cols,
      rowHeight: fluidity.rowHeightPx,
      margin: breakpoint.gridConfig.margin,
    };
  }

  if (fluidity.structuralMode === 'autoFill') {
    const cols = clamp(
      Math.floor(panelWidth / Math.max(1, fluidity.minTileWidthPx)),
      fluidity.minCols,
      fluidity.maxCols,
    );
    const rawHeight = panelWidth / Math.max(1, cols);
    const rowHeight = clamp(rawHeight, fluidity.minTileWidthPx, fluidity.maxTileWidthPx);
    return {
      cols,
      rowHeight: Math.round(rowHeight),
      margin: breakpoint.gridConfig.margin,
    };
  }

  if (fluidity.structuralMode === 'proportional') {
    const cols = clamp(
      Math.floor(panelWidth / Math.max(1, fluidity.minTileWidthPx)),
      fluidity.minCols,
      fluidity.maxCols,
    );
    const rowHeight = clamp(
      Math.round((panelWidth / Math.max(1, cols)) * 0.75),
      fluidity.minTileWidthPx,
      fluidity.maxTileWidthPx,
    );
    return {
      cols,
      rowHeight,
      margin: breakpoint.gridConfig.margin,
    };
  }

  return breakpoint.gridConfig;
};
