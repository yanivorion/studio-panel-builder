import React from 'react';
import ReactGridLayout from 'react-grid-layout';
import { noCompactor, verticalCompactor } from 'react-grid-layout/core';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
import type { GridLayoutItem, GridCompactor, TemplateAsset, TemplateBadgeSettings, TemplateObjectFit } from '../builder/types';
import { getTemplateTileBackground, resolveTemplateBadge, TemplateBadge } from './TemplateBadge';

interface RglCanvasProps {
  width: number;
  items: GridLayoutItem[];
  cols: number;
  rowHeight: number;
  margin: [number, number];
  compactor: GridCompactor;
  editMode: boolean;
  templatesById: Record<string, TemplateAsset>;
  itemPaddingX: number;
  itemPaddingY: number;
  itemBorderRadius: number;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  templateBadges?: Record<string, TemplateBadgeSettings> | null;
  onLayoutChange?: (items: GridLayoutItem[]) => void;
}

type RglItem = { i: string; x: number; y: number; w: number; h: number; minW?: number; minH?: number; maxW?: number; maxH?: number; static?: boolean };

function toRgl(items: GridLayoutItem[]): RglItem[] {
  return items.map(item => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW ?? 1,
    minH: item.minH ?? 1,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static,
  }));
}

function fromRgl(layout: RglItem[]): GridLayoutItem[] {
  return layout.map(item => ({
    i: item.i,
    x: item.x,
    y: item.y,
    w: item.w,
    h: item.h,
    minW: item.minW,
    minH: item.minH,
    maxW: item.maxW,
    maxH: item.maxH,
    static: item.static,
  }));
}

export const RglCanvas: React.FC<RglCanvasProps> = ({
  width,
  items,
  cols,
  rowHeight,
  margin,
  compactor,
  editMode,
  templatesById,
  itemPaddingX,
  itemPaddingY,
  itemBorderRadius,
  templateObjectFit,
  templatePadding,
  templateBadges,
  onLayoutChange,
}) => {
  const resolved = compactor === 'none' ? noCompactor : verticalCompactor;

  // Local layout — fast updates during drag/resize without re-rendering parent
  const [localLayout, setLocalLayout] = React.useState<RglItem[]>(() => toRgl(items));
  const localLayoutRef = React.useRef<RglItem[]>(localLayout);

  // Sync from parent when items change externally (preset applied, subgroup switch)
  const itemsSigRef = React.useRef('');
  React.useEffect(() => {
    const sig = items.map(i => `${i.i}:${i.x}:${i.y}:${i.w}:${i.h}`).join('|');
    if (sig !== itemsSigRef.current) {
      itemsSigRef.current = sig;
      const next = toRgl(items);
      localLayoutRef.current = next;
      setLocalLayout(next);
    }
  });

  const handleChange = (newLayout: RglItem[]) => {
    localLayoutRef.current = newLayout;
    setLocalLayout(newLayout);
  };

  // Only persist to App state when interaction ends — avoids re-render loops during drag
  const handleStop = () => {
    onLayoutChange?.(fromRgl(localLayoutRef.current));
  };

  return (
    <div
      className="rgl-canvas-wrap"
      style={{ '--tile-radius': `${itemBorderRadius}px` }}
    >
      <ReactGridLayout
        width={width}
        layout={localLayout}
        gridConfig={{ cols, rowHeight, margin }}
        dragConfig={{ enabled: editMode }}
        resizeConfig={{
          enabled: editMode && compactor === 'none',
          handles: ['se', 'sw', 'ne', 'nw'],
        }}
        compactor={resolved}
        onLayoutChange={handleChange as (layout: unknown) => void}
        onDragStop={handleStop as unknown as () => void}
        onResizeStop={handleStop as unknown as () => void}
      >
        {localLayout.map(item => {
          const template = templatesById[item.i];
          const badge = resolveTemplateBadge(item.i, templateBadges);
          return (
            <div
              key={item.i}
              className="rgl-tile"
              style={{ borderRadius: itemBorderRadius }}
            >
              <div
                style={{
                  position: 'relative',
                  padding: `${templatePadding[item.i] ?? itemPaddingY}px ${templatePadding[item.i] ?? itemPaddingX}px`,
                  borderRadius: itemBorderRadius,
                  background: getTemplateTileBackground(badge),
                  width: '100%',
                  height: '100%',
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              >
                <TemplateBadge settings={badge} />
                {template ? (
                  <img
                    src={template.src}
                    alt={template.name}
                    draggable={false}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: templateObjectFit[item.i] ?? 'contain',
                      borderRadius: Math.max(0, itemBorderRadius - 2),
                      display: 'block',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      display: 'grid',
                      placeItems: 'center',
                      width: '100%',
                      height: '100%',
                      fontSize: 11,
                      color: '#999',
                    }}
                  >
                    {item.i}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </ReactGridLayout>
    </div>
  );
};
