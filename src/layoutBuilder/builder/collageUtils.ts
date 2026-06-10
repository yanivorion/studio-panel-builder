/**
 * Shared collage layout utilities.
 *
 * EQUAL-HEIGHT ROW FORMULA
 * ────────────────────────────────────────────────────────────────────────────
 * Each tile slot must have the same total height H (the row height).
 * Because stacked tiles (2v, 3l-right, 3r-left) have TWO containers each with
 * their own paddingY plus a gap between them, a naive "shared innerH" formula
 * produces different slot heights across tile types → visual gaps.
 *
 * Instead we solve for H directly:
 *
 *   H = (containerWidth − C + B) / A
 *
 * where:
 *   A = Σ pureAspect_i
 *   B = Σ correctionFactor_i   (weighted height-overhead per tile type)
 *   C = Σ widthOverhead_i + (N−1)×gap
 *
 * correctionFactor per tile type:
 *   single    →  pureAspect × 2×paddingY
 *   2v        →  pureAspect × (4×paddingY + gap)
 *   3l        →  a_left × 2×paddingY  +  effRight × (4×paddingY + gap)
 *   3r        →  effLeft × (4×paddingY + gap)  +  a_right × 2×paddingY
 *
 * Once H is known, each tile's effective inner height is:
 *   single / spanning item  →  H − 2×paddingY
 *   stacked column          →  H − 4×paddingY − gap
 *
 * All slot heights equal H ⟹ NO GAPS between rows, no empty space inside slots.
 * All aspect ratios are preserved exactly (no letterboxing at scale = 1).
 */

import type { CollageTile, CollageSettings, GridLayoutItem, TemplateAsset } from './types';

// ── Natural aspect ratio ──────────────────────────────────────────────────────

export function naturalAspect(id: string, templatesById: Record<string, TemplateAsset>): number {
  const t = templatesById[id];
  return t && t.width && t.height ? t.width / t.height : 1;
}

// ── All item IDs in a tile ────────────────────────────────────────────────────

export function tileIds(tile: CollageTile): string[] {
  switch (tile.type) {
    case '1':  return [tile.id];
    case '2v': return [tile.top, tile.bottom];
    case '3l': return [tile.left, tile.rightTop, tile.rightBot];
    case '3r': return [tile.leftTop, tile.leftBot, tile.right];
  }
}

// ── Pure aspect ratio (inner-content ratio, no overhead) ─────────────────────

export function tilePureAspect(
  tile: CollageTile,
  templatesById: Record<string, TemplateAsset>,
  scales: Record<string, number>,
): number {
  switch (tile.type) {
    case '1': {
      const s = Math.max(0.1, scales[tile.id] ?? 1);
      return s * naturalAspect(tile.id, templatesById);
    }
    case '2v': {
      const at = naturalAspect(tile.top, templatesById);
      const ab = naturalAspect(tile.bottom, templatesById);
      return (at * ab) / (at + ab);
    }
    case '3l': {
      const al  = naturalAspect(tile.left,     templatesById);
      const art = naturalAspect(tile.rightTop, templatesById);
      const arb = naturalAspect(tile.rightBot, templatesById);
      return al + (art * arb) / (art + arb);
    }
    case '3r': {
      const alt = naturalAspect(tile.leftTop, templatesById);
      const alb = naturalAspect(tile.leftBot, templatesById);
      const ar  = naturalAspect(tile.right,   templatesById);
      return (alt * alb) / (alt + alb) + ar;
    }
  }
}

// ── Width overhead (paddingX + internal gap for grouped tiles) ────────────────

export function tileWidthOverhead(tile: CollageTile, paddingX: number, gap: number): number {
  return (tile.type === '3l' || tile.type === '3r')
    ? 4 * paddingX + gap   // two sub-columns, each with own paddingX, plus internal gap
    : 2 * paddingX;
}

// ── Row calculation ───────────────────────────────────────────────────────────

export interface TileCalc {
  slotWidth:  number;  // full allocated width (includes all overhead)
  slotHeight: number;  // = row height H (same for every tile in the row)
  innerH:     number;  // H − 2×paddingY  (effective single-item content height)
  // 2v:  subData = [topInnerH, botInnerH]
  // 3l:  subData = [leftInnerH, rtInnerH, rbInnerH, leftPureW, rightPureW]
  // 3r:  subData = [ltInnerH,  lbInnerH,  rightInnerH, leftPureW, rightPureW]
  subData?: number[];
}

export function calcRow(
  tiles: CollageTile[],
  templatesById: Record<string, TemplateAsset>,
  scales: Record<string, number>,
  containerWidth: number,
  gap: number,
  paddingX: number,
  paddingY: number,
): { calcs: TileCalc[]; rowHeight: number } {
  const N = tiles.length;
  if (N === 0) return { calcs: [], rowHeight: 0 };

  const pureAspects   = tiles.map(t => tilePureAspect(t, templatesById, scales));
  const widthOverheads = tiles.map(t => tileWidthOverhead(t, paddingX, gap));

  // ── Equal-H correction factors ────────────────────────────────────────────
  const correctionFactors = tiles.map((tile, i) => {
    if (tile.type === '1') {
      return pureAspects[i] * 2 * paddingY;
    }
    if (tile.type === '2v') {
      return pureAspects[i] * (4 * paddingY + gap);
    }
    if (tile.type === '3l') {
      const al  = naturalAspect(tile.left,     templatesById);
      const art = naturalAspect(tile.rightTop, templatesById);
      const arb = naturalAspect(tile.rightBot, templatesById);
      const effR = (art * arb) / (art + arb);
      return al * 2 * paddingY + effR * (4 * paddingY + gap);
    }
    // 3r
    const alt = naturalAspect(tile.leftTop, templatesById);
    const alb = naturalAspect(tile.leftBot, templatesById);
    const ar  = naturalAspect(tile.right,   templatesById);
    const effL = (alt * alb) / (alt + alb);
    return effL * (4 * paddingY + gap) + ar * 2 * paddingY;
  });

  const A = pureAspects.reduce((s, a) => s + a, 0);
  const B = correctionFactors.reduce((s, c) => s + c, 0);
  const C = widthOverheads.reduce((s, o) => s + o, 0) + (N - 1) * gap;

  // Row height H — all slots have exactly this height
  const H = Math.max(2 * paddingY + 30, (containerWidth - C + B) / Math.max(0.001, A));
  const rowHeight = Math.round(H);

  // ── Per-tile slot widths ───────────────────────────────────────────────────
  // slotWidth = f(tile, H) — already linear in H
  const innH_single  = H - 2 * paddingY;            // effective innerH for singles / spanning
  const innH_stacked = H - 4 * paddingY - gap;       // effective innerH for stacked columns

  const floatWidths = tiles.map((tile, i) => {
    if (tile.type === '1') {
      return pureAspects[i] * innH_single + widthOverheads[i];
    }
    if (tile.type === '2v') {
      return pureAspects[i] * innH_stacked + widthOverheads[i];
    }
    if (tile.type === '3l') {
      const al  = naturalAspect(tile.left,     templatesById);
      const art = naturalAspect(tile.rightTop, templatesById);
      const arb = naturalAspect(tile.rightBot, templatesById);
      const effR = (art * arb) / (art + arb);
      return al * innH_single + effR * innH_stacked + widthOverheads[i];
    }
    // 3r
    const alt = naturalAspect(tile.leftTop, templatesById);
    const alb = naturalAspect(tile.leftBot, templatesById);
    const ar  = naturalAspect(tile.right,   templatesById);
    const effL = (alt * alb) / (alt + alb);
    return effL * innH_stacked + ar * innH_single + widthOverheads[i];
  });

  // Floor + push rounding error to last slot
  const slotWidths = floatWidths.map(w => Math.floor(w));
  const sumFloor   = slotWidths.reduce((s, w) => s + w, 0) + (N - 1) * gap;
  slotWidths[slotWidths.length - 1] += containerWidth - sumFloor;

  // ── Per-tile calcs ─────────────────────────────────────────────────────────
  const calcs: TileCalc[] = tiles.map((tile, i) => {
    const slotWidth = slotWidths[i];
    const innerH    = Math.round(innH_single);  // content height for spanning/single items

    if (tile.type === '1') {
      return { slotWidth, slotHeight: rowHeight, innerH };
    }

    if (tile.type === '2v') {
      const innerW = slotWidth - 2 * paddingX;
      const at = naturalAspect(tile.top,    templatesById);
      const ab = naturalAspect(tile.bottom, templatesById);
      const topH = Math.round(innerW / at);
      const botH = Math.round(innerW / ab);
      return { slotWidth, slotHeight: rowHeight, innerH, subData: [topH, botH] };
    }

    if (tile.type === '3l') {
      const al  = naturalAspect(tile.left,     templatesById);
      const art = naturalAspect(tile.rightTop, templatesById);
      const arb = naturalAspect(tile.rightBot, templatesById);
      const effR      = (art * arb) / (art + arb);
      const leftPureW = al  * innH_single;
      const rightPureW = effR * innH_stacked;
      const rightTopH  = Math.round(rightPureW / art);
      const rightBotH  = Math.round(rightPureW / arb);
      return {
        slotWidth, slotHeight: rowHeight, innerH,
        subData: [Math.round(innH_single), rightTopH, rightBotH,
                  Math.round(leftPureW), Math.round(rightPureW)],
      };
    }

    // 3r
    const alt = naturalAspect(tile.leftTop, templatesById);
    const alb = naturalAspect(tile.leftBot, templatesById);
    const ar  = naturalAspect(tile.right,   templatesById);
    const effL      = (alt * alb) / (alt + alb);
    const leftPureW = effL * innH_stacked;
    const rightPureW = ar  * innH_single;
    const leftTopH  = Math.round(leftPureW / alt);
    const leftBotH  = Math.round(leftPureW / alb);
    return {
      slotWidth, slotHeight: rowHeight, innerH,
      subData: [leftTopH, leftBotH, Math.round(innH_single),
                Math.round(leftPureW), Math.round(rightPureW)],
    };
  });

  return { calcs, rowHeight };
}

// ── GridLayoutItem ↔ CollageTile row conversion ───────────────────────────────

let _gid = 0;
const nextGid = () => `cg${++_gid}`;

export function itemsToCollageTileRows(items: GridLayoutItem[]): CollageTile[][] {
  if (!items.length) return [];

  const rowMap = new Map<number, GridLayoutItem[]>();
  for (const item of items) {
    if (!rowMap.has(item.y)) rowMap.set(item.y, []);
    rowMap.get(item.y)!.push(item);
  }

  return [...rowMap.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, rowItems]) => {
      const slotMap = new Map<number, GridLayoutItem[]>();
      for (const item of rowItems) {
        if (!slotMap.has(item.x)) slotMap.set(item.x, []);
        slotMap.get(item.x)!.push(item);
      }
      return [...slotMap.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, slot]): CollageTile => {
          if (slot.length === 1) return { type: '1', id: slot[0].i };
          const s = [...slot].sort((a, b) => (a.meta?.groupPos ?? 0) - (b.meta?.groupPos ?? 0));
          const gt = s[0].meta?.groupType;
          if (gt === '3l' && s.length >= 3)
            return { type: '3l', left: s[0].i, rightTop: s[1].i, rightBot: s[2].i };
          if (gt === '3r' && s.length >= 3)
            return { type: '3r', leftTop: s[0].i, leftBot: s[1].i, right: s[2].i };
          return { type: '2v', top: s[0].i, bottom: s[1].i };
        });
    });
}

export function collageTileRowsToItems(rows: CollageTile[][]): GridLayoutItem[] {
  const out: GridLayoutItem[] = [];
  rows.forEach((row, ri) => {
    row.forEach((tile, ci) => {
      if (tile.type === '1') {
        out.push({ i: tile.id, x: ci, y: ri, w: 1, h: 1 });
      } else if (tile.type === '2v') {
        const gid = nextGid();
        out.push({ i: tile.top,    x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 0, groupType: '2v' } });
        out.push({ i: tile.bottom, x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 1, groupType: '2v' } });
      } else if (tile.type === '3l') {
        const gid = nextGid();
        out.push({ i: tile.left,     x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 0, groupType: '3l' } });
        out.push({ i: tile.rightTop, x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 1, groupType: '3l' } });
        out.push({ i: tile.rightBot, x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 2, groupType: '3l' } });
      } else if (tile.type === '3r') {
        const gid = nextGid();
        out.push({ i: tile.leftTop, x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 0, groupType: '3r' } });
        out.push({ i: tile.leftBot, x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 1, groupType: '3r' } });
        out.push({ i: tile.right,   x: ci, y: ri, w: 1, h: 1, meta: { groupId: gid, groupPos: 2, groupType: '3r' } });
      }
    });
  });
  return out;
}

// ── Group pattern: parse + apply ──────────────────────────────────────────────

export type GroupPatternToken = '1' | '2h' | '2v' | '3h' | '3l' | '3r';

const ITEMS_PER_GROUP: Record<GroupPatternToken, number> = {
  '1': 1, '2h': 2, '2v': 2, '3h': 3, '3l': 3, '3r': 3,
};

export function parseGroupPattern(raw: string): GroupPatternToken[] {
  const valid = new Set<string>(['1','2h','2v','3h','3l','3r']);
  const tokens = raw.split(',').map(s => s.trim().toLowerCase()).filter(s => valid.has(s));
  return tokens.length > 0 ? (tokens as GroupPatternToken[]) : ['1'];
}

export function applyGroupPattern(ids: string[], pattern: GroupPatternToken[]): CollageTile[] {
  const tiles: CollageTile[] = [];
  let idx = 0;
  let pi  = 0;

  while (idx < ids.length) {
    const token = pattern[pi % pattern.length];
    pi++;
    const have = ids.length - idx;
    if (have <= 0) break;

    if (token === '1') {
      tiles.push({ type: '1', id: ids[idx++] });
    } else if (token === '2h') {
      tiles.push({ type: '1', id: ids[idx++] });
      if (idx < ids.length) tiles.push({ type: '1', id: ids[idx++] });
    } else if (token === '2v') {
      if (have >= 2) {
        tiles.push({ type: '2v', top: ids[idx], bottom: ids[idx + 1] });
        idx += 2;
      } else {
        tiles.push({ type: '1', id: ids[idx++] });
      }
    } else if (token === '3h') {
      for (let k = 0; k < 3 && idx < ids.length; k++) {
        tiles.push({ type: '1', id: ids[idx++] });
      }
    } else if (token === '3l') {
      if (have >= 3) {
        tiles.push({ type: '3l', left: ids[idx], rightTop: ids[idx+1], rightBot: ids[idx+2] });
        idx += 3;
      } else {
        while (idx < ids.length) tiles.push({ type: '1', id: ids[idx++] });
      }
    } else if (token === '3r') {
      if (have >= 3) {
        tiles.push({ type: '3r', leftTop: ids[idx], leftBot: ids[idx+1], right: ids[idx+2] });
        idx += 3;
      } else {
        while (idx < ids.length) tiles.push({ type: '1', id: ids[idx++] });
      }
    }
  }

  return tiles;
}

// ── Pack flat CollageTile[] into rows ─────────────────────────────────────────

export function packTilesIntoRows(
  tiles: CollageTile[],
  templatesById: Record<string, TemplateAsset>,
  scales: Record<string, number>,
  containerWidth: number,
  gap: number,
  paddingX: number,
  paddingY: number,
  settings: CollageSettings,
): CollageTile[][] {
  const { targetRowHeight, minItemSize } = settings;
  const rows: CollageTile[][] = [];
  let cur: CollageTile[] = [];

  for (const tile of tiles) {
    const tryRow = [...cur, tile];
    const { calcs, rowHeight } = calcRow(tryRow, templatesById, scales, containerWidth, gap, paddingX, paddingY);

    // Minimum inner width across all sub-items in this row
    const minInnerW = Math.min(
      ...calcs.map((c, i) => {
        const t = tryRow[i];
        if (t.type === '1' || t.type === '2v') return c.slotWidth - 2 * paddingX;
        // 3l/3r: min of the two sub-column pure widths
        const leftPureW  = c.subData?.[3] ?? c.slotWidth / 2;
        const rightPureW = c.subData?.[4] ?? c.slotWidth / 2;
        return Math.min(leftPureW, rightPureW);
      }),
    );

    const tooNarrow = minInnerW < minItemSize;
    const tooShort  = cur.length >= 1 && rowHeight < targetRowHeight * 0.55;

    if (cur.length > 0 && (tooNarrow || tooShort)) {
      rows.push(cur);
      cur = [tile];
    } else {
      cur = tryRow;
    }
  }

  if (cur.length > 0) rows.push(cur);
  return rows;
}
