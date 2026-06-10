/**
 * CollageCanvas — row-equalization layout engine.
 */

import React from 'react';
import {
  calcRow,
  collageTileRowsToItems,
  itemsToCollageTileRows,
  tileIds,
} from '../builder/collageUtils';
import type { CollageTile, GridLayoutItem, TemplateAsset, TemplateBadgeSettings, TemplateObjectFit } from '../builder/types';
import { getTemplateTileBackground, resolveTemplateBadge, TemplateBadge } from './TemplateBadge';

interface Props {
  items: GridLayoutItem[];
  containerWidth: number;
  gap: number;
  paddingX: number;
  paddingY: number;
  itemBorderRadius: number;
  templatesById: Record<string, TemplateAsset>;
  templateScales: Record<string, number>;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  templateBadges?: Record<string, TemplateBadgeSettings> | null;
  editMode: boolean;
  onLayoutChange?: (items: GridLayoutItem[]) => void;
}

type DragState = { tileKey: string; rowIdx: number; colIdx: number } | null;
type DropPos   =
  | { kind: 'insert';  rowIdx: number; insertAt: number }
  | { kind: 'new-row'; afterRowIdx: number };

export const CollageCanvas: React.FC<Props> = ({
  items,
  containerWidth,
  gap,
  paddingX,
  paddingY,
  itemBorderRadius,
  templatesById,
  templateScales,
  templateObjectFit,
  templatePadding,
  templateBadges,
  editMode,
  onLayoutChange,
}) => {
  const [rows, setRows] = React.useState<CollageTile[][]>(() => toRows(items));

  const sigRef = React.useRef('');
  React.useEffect(() => {
    const sig = items.map(i => `${i.i}:${i.x}:${i.y}:${i.meta?.groupType ?? ''}`).join('|');
    if (sig !== sigRef.current) {
      sigRef.current = sig;
      setRows(toRows(items));
    }
  });

  const [drag, setDrag]       = React.useState<DragState>(null);
  const [dropPos, setDropPos] = React.useState<DropPos | null>(null);

  const commit = React.useCallback((newRows: CollageTile[][]) => {
    const cleaned = newRows.filter(r => r.length > 0);
    setRows(cleaned);
    onLayoutChange?.(collageTileRowsToItems(cleaned));
  }, [onLayoutChange]);

  const onTileDragStart = (tileKey: string, ri: number, ci: number, e: React.DragEvent) => {
    setDrag({ tileKey, rowIdx: ri, colIdx: ci });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tileKey);
  };

  const onTileDragOver = (ri: number, ci: number, e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (!drag) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const ry = (e.clientY - rect.top) / rect.height;
    const rx = (e.clientX - rect.left) / rect.width;
    if (ry < 0.22)      setDropPos({ kind: 'new-row', afterRowIdx: ri - 1 });
    else if (ry > 0.78) setDropPos({ kind: 'new-row', afterRowIdx: ri });
    else                setDropPos({ kind: 'insert', rowIdx: ri, insertAt: rx < 0.5 ? ci : ci + 1 });
  };

  const onGapDragOver = (afterRowIdx: number, e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDropPos({ kind: 'new-row', afterRowIdx });
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!drag || !dropPos) { setDrag(null); setDropPos(null); return; }
    const nr = rows.map(r => [...r]);
    const dragged = nr[drag.rowIdx][drag.colIdx];
    nr[drag.rowIdx].splice(drag.colIdx, 1);
    if (dropPos.kind === 'insert') {
      let at = dropPos.insertAt;
      if (drag.rowIdx === dropPos.rowIdx && drag.colIdx < dropPos.insertAt) at--;
      const row = nr[dropPos.rowIdx] ?? [];
      row.splice(Math.max(0, at), 0, dragged);
      nr[dropPos.rowIdx] = row;
    } else {
      nr.splice(dropPos.afterRowIdx + 1, 0, [dragged]);
    }
    commit(nr);
    setDrag(null); setDropPos(null);
  };

  const onDragEnd = () => { setDrag(null); setDropPos(null); };

  return (
    <div
      className="collage-canvas"
      onDrop={onDrop}
      onDragOver={e => e.preventDefault()}
      onDragEnd={onDragEnd}
      style={{ width: containerWidth, userSelect: 'none', overflow: 'hidden' }}
    >
      {rows.map((row, ri) => {
        const { calcs, rowHeight } = calcRow(
          row, templatesById, templateScales, containerWidth, gap, paddingX, paddingY,
        );
        const lineAbove = dropPos?.kind === 'new-row' && dropPos.afterRowIdx === ri - 1;
        const lineBelow = dropPos?.kind === 'new-row' && dropPos.afterRowIdx === ri;

        return (
          <React.Fragment key={`row-${ri}`}>
            {ri > 0 && (
              <div
                onDragOver={e => onGapDragOver(ri - 1, e)}
                onDrop={onDrop}
                style={{ height: gap, position: 'relative', flexShrink: 0 }}
              >
                {lineAbove && <HLine />}
              </div>
            )}

            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                width: containerWidth,
                height: rowHeight,
                position: 'relative',
                flexShrink: 0,
              }}
            >
              {ri === 0 && lineAbove && <AbsLine top={-Math.ceil(gap / 2) - 1} />}
              {lineBelow && <AbsLine bottom={-Math.ceil(gap / 2) - 1} />}

              {row.map((tile, ci) => {
                const calc = calcs[ci];
                if (!calc) return null;
                const tKey = tileIds(tile).join(':');
                const isDragging   = drag?.tileKey === tKey;
                const insertBefore = dropPos?.kind === 'insert' && dropPos.rowIdx === ri && dropPos.insertAt === ci;
                const insertAfter  = dropPos?.kind === 'insert' && dropPos.rowIdx === ri && dropPos.insertAt === ci + 1;
                const isLast       = ci === row.length - 1;

                return (
                  <React.Fragment key={tKey}>
                    {ci > 0 && (
                      <div style={{ width: gap, height: calc.slotHeight, flexShrink: 0, position: 'relative', pointerEvents: 'none' }}>
                        {insertBefore && <VLine />}
                      </div>
                    )}
                    {renderTile(tile, ci, calc, {
                      gap, paddingX, paddingY, itemBorderRadius, editMode, templatesById,
                      templateObjectFit, templatePadding, templateBadges,
                      isDragging, insertBefore, insertAfter, isLast,
                      onDragStart: e => onTileDragStart(tKey, ri, ci, e),
                      onDragOver:  e => onTileDragOver(ri, ci, e),
                    })}
                  </React.Fragment>
                );
              })}
            </div>
          </React.Fragment>
        );
      })}

      {drag && (
        <div
          onDragOver={e => onGapDragOver(rows.length - 1, e)}
          onDrop={onDrop}
          style={{ height: Math.max(40, gap * 2), width: '100%', position: 'relative' }}
        >
          {dropPos?.kind === 'new-row' && dropPos.afterRowIdx === rows.length - 1 && <HLine top={12} />}
        </div>
      )}
    </div>
  );
};

function toRows(items: GridLayoutItem[]): CollageTile[][] {
  const r = itemsToCollageTileRows(items);
  return r.length > 0 ? r : items.length > 0 ? [items.map(i => ({ type: '1' as const, id: i.i }))] : [];
}

interface TileCtx {
  gap: number;
  paddingX: number;
  paddingY: number;
  itemBorderRadius: number;
  editMode: boolean;
  templatesById: Record<string, TemplateAsset>;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  templateBadges?: Record<string, TemplateBadgeSettings> | null;
  isDragging: boolean;
  insertBefore: boolean;
  insertAfter: boolean;
  isLast: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver:  (e: React.DragEvent) => void;
}

function renderTile(tile: CollageTile, ci: number, calc: ReturnType<typeof calcRow>['calcs'][number], ctx: TileCtx): React.ReactElement {
  const { gap, paddingX, paddingY, itemBorderRadius, editMode, templatesById,
          templateObjectFit, templatePadding, templateBadges,
          isDragging, insertBefore, insertAfter, isLast,
          onDragStart, onDragOver } = ctx;

  const itemPadX = (id: string) => templatePadding[id] ?? paddingX;
  const itemPadY = (id: string) => templatePadding[id] ?? paddingY;

  const itemBox = (w: number, innerH: number, id: string): React.CSSProperties => {
    const badge = resolveTemplateBadge(id, templateBadges);
    return {
      width: w,
      height: innerH + 2 * paddingY,
      flexShrink: 0,
      background: getTemplateTileBackground(badge),
      borderRadius: itemBorderRadius,
      padding: `${itemPadY(id)}px ${itemPadX(id)}px`,
      boxSizing: 'border-box',
      overflow: 'hidden',
      position: 'relative',
    };
  };

  const renderBadge = (id: string) => (
    <TemplateBadge settings={resolveTemplateBadge(id, templateBadges)} />
  );

  const groupWrapper = (w: number, h: number, dir: 'row' | 'column'): React.CSSProperties => ({
    width: w,
    height: h,
    flexShrink: 0,
    display: 'flex',
    flexDirection: dir,
    alignItems: 'flex-start',
    gap,
    opacity: isDragging ? 0.25 : 1,
    cursor: editMode ? 'grab' : 'default',
    position: 'relative',
  });

  const imgEl = (t: TemplateAsset | undefined, id: string) =>
    t ? (
      <img
        src={t.src} alt={t.name} draggable={false}
        style={{
          width: '100%', height: '100%',
          objectFit: templateObjectFit[id] ?? 'contain',
          borderRadius: Math.max(0, itemBorderRadius - 2),
          display: 'block', pointerEvents: 'none',
        }}
      />
    ) : (
      <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 10, color: '#bbb' }}>
        {id}
      </div>
    );

  const itemContent = (id: string, t: TemplateAsset | undefined, boxStyle: React.CSSProperties) => (
    <div style={boxStyle}>
      {renderBadge(id)}
      {imgEl(t, id)}
    </div>
  );

  if (tile.type === '1') {
    const t = templatesById[tile.id];
    return (
      <div
        draggable={editMode}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        style={{
          ...itemBox(calc.slotWidth, calc.innerH, tile.id),
          opacity: isDragging ? 0.25 : 1,
          cursor: editMode ? 'grab' : 'default',
        }}
      >
        {ci === 0 && insertBefore && <VLine abs left={0} />}
        {insertAfter && isLast && <VLine abs right={0} />}
        {renderBadge(tile.id)}
        {imgEl(t, tile.id)}
      </div>
    );
  }

  if (tile.type === '2v') {
    const [topH, botH] = calc.subData ?? [calc.innerH / 2, calc.innerH / 2];
    const tTop = templatesById[tile.top];
    const tBot = templatesById[tile.bottom];
    return (
      <div
        draggable={editMode}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        style={groupWrapper(calc.slotWidth, calc.slotHeight, 'column')}
      >
        {ci === 0 && insertBefore && <VLine abs left={0} />}
        {insertAfter && isLast && <VLine abs right={0} />}
        {itemContent(tile.top, tTop, itemBox(calc.slotWidth, topH, tile.top))}
        {itemContent(tile.bottom, tBot, itemBox(calc.slotWidth, botH, tile.bottom))}
      </div>
    );
  }

  if (tile.type === '3l') {
    const [leftInnerH, rtInnerH, rbInnerH, leftPureW, rightPureW] =
      calc.subData ?? [calc.innerH, calc.innerH / 2, calc.innerH / 2, calc.slotWidth / 2, calc.slotWidth / 2];
    const leftContW  = Math.round(leftPureW)  + 2 * paddingX;
    const rightContW = Math.round(rightPureW) + 2 * paddingX;
    const tLeft = templatesById[tile.left];
    const tRT   = templatesById[tile.rightTop];
    const tRB   = templatesById[tile.rightBot];
    return (
      <div
        draggable={editMode}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        style={groupWrapper(calc.slotWidth, calc.slotHeight, 'row')}
      >
        {ci === 0 && insertBefore && <VLine abs left={0} />}
        {insertAfter && isLast && <VLine abs right={0} />}
        {itemContent(tile.left, tLeft, itemBox(leftContW, leftInnerH, tile.left))}
        <div style={{ display: 'flex', flexDirection: 'column', gap, flexShrink: 0 }}>
          {itemContent(tile.rightTop, tRT, itemBox(rightContW, rtInnerH, tile.rightTop))}
          {itemContent(tile.rightBot, tRB, itemBox(rightContW, rbInnerH, tile.rightBot))}
        </div>
      </div>
    );
  }

  const [ltInnerH, lbInnerH, rightInnerH, leftPureW, rightPureW] =
    calc.subData ?? [calc.innerH / 2, calc.innerH / 2, calc.innerH, calc.slotWidth / 2, calc.slotWidth / 2];
  const leftContW  = Math.round(leftPureW)  + 2 * paddingX;
  const rightContW = Math.round(rightPureW) + 2 * paddingX;
  const tLT  = templatesById[tile.leftTop];
  const tLB  = templatesById[tile.leftBot];
  const tR   = templatesById[tile.right];
  return (
    <div
      draggable={editMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      style={groupWrapper(calc.slotWidth, calc.slotHeight, 'row')}
    >
      {ci === 0 && insertBefore && <VLine abs left={0} />}
      {insertAfter && isLast && <VLine abs right={0} />}
      <div style={{ display: 'flex', flexDirection: 'column', gap, flexShrink: 0 }}>
        {itemContent(tile.leftTop, tLT, itemBox(leftContW, ltInnerH, tile.leftTop))}
        {itemContent(tile.leftBot, tLB, itemBox(leftContW, lbInnerH, tile.leftBot))}
      </div>
      {itemContent(tile.right, tR, itemBox(rightContW, rightInnerH, tile.right))}
    </div>
  );
}

const HLine: React.FC<{ top?: number }> = ({ top }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0,
    top: top !== undefined ? top : '50%',
    transform: top !== undefined ? 'none' : 'translateY(-50%)',
    height: 2, background: '#4f6ef7', borderRadius: 1, pointerEvents: 'none',
  }} />
);

const AbsLine: React.FC<{ top?: number; bottom?: number }> = ({ top, bottom }) => (
  <div style={{
    position: 'absolute', left: 0, right: 0, height: 2,
    ...(top !== undefined ? { top } : { bottom }),
    background: '#4f6ef7', borderRadius: 1, zIndex: 10, pointerEvents: 'none',
  }} />
);

const VLine: React.FC<{ abs?: boolean; left?: number; right?: number }> = ({ abs, left, right }) =>
  abs ? (
    <div style={{
      position: 'absolute', top: 0, bottom: 0, width: 2,
      ...(left !== undefined ? { left } : { right }),
      background: '#4f6ef7', borderRadius: 1, zIndex: 10, pointerEvents: 'none',
    }} />
  ) : (
    <div style={{
      position: 'absolute', top: 0, bottom: 0, left: '50%',
      transform: 'translateX(-50%)', width: 2,
      background: '#4f6ef7', borderRadius: 1, pointerEvents: 'none',
    }} />
  );
