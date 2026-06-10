export type GalleryLayoutMode =
  | 'Collage'
  | 'Grid'
  | 'Masonry'
  | 'Flex'
  | 'Collection';

export type BreakpointPlacement = 'manual' | 'generated';
export type GridCompactor = 'vertical' | 'horizontal' | 'none';
export type FluidityWithin = 'static' | 'recalculate';
export type FluidityMode = 'fixed' | 'proportional' | 'widthOnly' | 'autoFill';

export type TemplateObjectFit = 'contain' | 'cover' | 'fill' | 'scale-down';

/** Badge overlay variants matching Wix Studio template container references */
export type TemplateBadgeVariant =
  | 'pill'              // pink pill, white text (Stores / Events)
  | 'text-icon'         // pink label + pink square icon (inline, text first)
  | 'icon-text'         // pink square icon + pink label (inline, icon first)
  | 'text-only'         // pink label only, top-left
  | 'icon-corner'       // dataconnect icon only, top-right
  | 'pill-icon-split'   // pill top-left + icon top-right
  | 'text-icon-split';  // label top-left + icon top-right

export interface TemplateBadgeSettings {
  enabled: boolean;
  variant: TemplateBadgeVariant;
  label: string;
  darkContainer: boolean;
}

export const BADGE_VARIANT_OPTIONS: { id: TemplateBadgeVariant; label: string; hint: string }[] = [
  { id: 'pill', label: 'Pill tag', hint: 'Solid pink pill with white text (Stores / Events)' },
  { id: 'text-icon', label: 'Label + icon', hint: 'Pink label with square icon after text' },
  { id: 'icon-text', label: 'Icon + label', hint: 'Pink square icon before label text' },
  { id: 'text-only', label: 'Label only', hint: 'Pink text label, no icon' },
  { id: 'icon-corner', label: 'Icon corner', hint: 'Dataconnect icon only, top-right' },
  { id: 'pill-icon-split', label: 'Pill + icon', hint: 'Pill badge top-left, icon top-right' },
  { id: 'text-icon-split', label: 'Label + icon split', hint: 'Label top-left, icon top-right' },
];

export const DEFAULT_BADGE_SETTINGS: TemplateBadgeSettings = {
  enabled: false,
  variant: 'text-icon',
  label: 'Bookings',
  darkContainer: true,
};

export interface TemplateAsset {
  id: string;
  name: string;
  src: string;
  width: number;
  height: number;
  isPlaceholder?: boolean;
  containerSlot?: boolean;
  slotIndex?: number;
  groupId?: string;
}

export interface TemplateSubgroup {
  id: string;
  name: string;
  templateIds: string[];
}

export type CollageGroupType = '2v' | '3l' | '3r';

export interface GridLayoutItem {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  draggable?: boolean;
  resizable?: boolean;
  constraints?: unknown[];
  /** Collage group membership. Items sharing the same (x, y, groupId) form a group. */
  meta?: {
    groupId?: string;
    groupPos?: number;       // 0 = top/left, 1 = bottom/right-top, 2 = right-bot
    groupType?: CollageGroupType;
  };
}

// ── Collage tile types ───────────────────────────────────────────────────────

export interface SingleTile { type: '1';  id: string }
export interface PairTile   { type: '2v'; top: string; bottom: string }
export interface TrioLTile  { type: '3l'; left: string; rightTop: string; rightBot: string }
export interface TrioRTile  { type: '3r'; leftTop: string; leftBot: string; right: string }
export type CollageTile = SingleTile | PairTile | TrioLTile | TrioRTile;

export interface CollageSettings {
  targetRowHeight: number;  // px — preferred row inner height
  minItemSize: number;      // px — min inner width before forcing new row
  groupPattern: string;     // e.g. "2h,2v,3l" — cycling group types applied to ordered items
}

export interface FlexSettings {
  minItemWidth: number;  // px — minimum item width (flex-basis)
  maxItemWidth: number;  // px — maximum item width (flex grows up to this)
  itemHeight: number;    // px — fixed row height for all items
  scrollable: boolean;   // overflow-x: auto (true) or wrap to next line (false)
}

export interface BreakpointFluidity {
  withinBreakpoint: FluidityWithin;
  structuralMode: FluidityMode;
  minTileWidthPx: number;
  maxTileWidthPx: number;
  minCols: number;
  maxCols: number;
  rowHeightPx: number;
}

export interface LayoutBreakpoint {
  key: string;
  label: string;
  minWidth: number;
  galleryLayout: GalleryLayoutMode;
  placement: BreakpointPlacement;
  gridConfig: {
    cols: number;
    rowHeight: number;
    margin: [number, number];
  };
  compactor: GridCompactor;
  items: GridLayoutItem[];
  presetId?: string;
  fluidity: BreakpointFluidity;
  collageSettings?: CollageSettings;
  flexSettings?: FlexSettings;
}

export interface GridEngineConfig {
  version: 1;
  defaultPresetId: string;
  breakpoints: LayoutBreakpoint[];
}

export interface BuilderSnapshotV2 {
  version: '2.0';
  panelWidth: number;
  panelHeight: number;
  selectedSubgroupId: string;
  activeBreakpointKey: string;
  orderedTemplateIdsBySubgroup: Record<string, string[]>;
  templates: TemplateAsset[];
  subgroups: TemplateSubgroup[];
  gridEngine: GridEngineConfig;
}
