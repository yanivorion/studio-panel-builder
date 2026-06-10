import React from 'react';
import type { FlexSettings, GridLayoutItem, TemplateAsset, TemplateBadgeSettings, TemplateObjectFit } from '../builder/types';
import { getTemplateTileBackground, resolveTemplateBadge, TemplateBadge } from './TemplateBadge';

interface FlexCanvasProps {
  items: GridLayoutItem[];
  containerWidth: number;
  gap: number;
  paddingX: number;
  paddingY: number;
  itemBorderRadius: number;
  templatesById: Record<string, TemplateAsset>;
  flexSettings: FlexSettings;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  templateBadges?: Record<string, TemplateBadgeSettings> | null;
  editMode: boolean;
  onLayoutChange?: (items: GridLayoutItem[]) => void;
}

export const FlexCanvas: React.FC<FlexCanvasProps> = ({
  items,
  containerWidth,
  gap,
  paddingX,
  paddingY,
  itemBorderRadius,
  templatesById,
  flexSettings,
  templateObjectFit,
  templatePadding,
  templateBadges,
  editMode,
  onLayoutChange,
}) => {
  const { minItemWidth, maxItemWidth, itemHeight, scrollable } = flexSettings;
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [overIdx, setOverIdx] = React.useState<number | null>(null);

  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIdx(idx);
  };

  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setOverIdx(idx);
  };

  const handleDrop = (toIdx: number) => (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedIdx === null || draggedIdx === toIdx) {
      setDraggedIdx(null);
      setOverIdx(null);
      return;
    }
    const next = [...items];
    const [moved] = next.splice(draggedIdx, 1);
    next.splice(toIdx, 0, moved);
    onLayoutChange?.(next);
    setDraggedIdx(null);
    setOverIdx(null);
  };

  const handleDragEnd = () => {
    setDraggedIdx(null);
    setOverIdx(null);
  };

  // Visual min/max indicator: compute how many items fit at minWidth vs maxWidth
  const itemsAtMin = Math.floor((containerWidth + gap) / (minItemWidth + gap));
  const itemsAtMax = Math.max(1, Math.floor((containerWidth + gap) / (maxItemWidth + gap)));

  const innerH = itemHeight - 2 * paddingY;

  return (
    <div style={{ width: containerWidth }}>
      {/* Ruler showing min/max range */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
        fontSize: 11,
        color: '#888',
        userSelect: 'none',
      }}>
        <span style={{ background: '#e8f0fe', borderRadius: 4, padding: '2px 6px' }}>
          min {minItemWidth}px · {itemsAtMin} per row
        </span>
        <span style={{ color: '#ccc' }}>—</span>
        <span style={{ background: '#fce8e6', borderRadius: 4, padding: '2px 6px' }}>
          max {maxItemWidth}px · {itemsAtMax} per row
        </span>
      </div>

      {/* Flex strip */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: scrollable ? 'nowrap' : 'wrap',
          gap,
          width: containerWidth,
          overflowX: scrollable ? 'auto' : 'hidden',
          overflowY: 'hidden',
          paddingBottom: scrollable ? 4 : 0,
        }}
      >
        {items.map((item, idx) => {
          const t = templatesById[item.i];
          const badge = resolveTemplateBadge(item.i, templateBadges);
          const isDragging  = draggedIdx === idx;
          const isDropTarget = overIdx === idx && draggedIdx !== null && draggedIdx !== idx;
          return (
            <div
              key={item.i}
              draggable={editMode}
              onDragStart={editMode ? handleDragStart(idx) : undefined}
              onDragOver={editMode ? handleDragOver(idx) : undefined}
              onDrop={editMode ? handleDrop(idx) : undefined}
              onDragEnd={editMode ? handleDragEnd : undefined}
              style={{
                position: 'relative',
                flex: `1 1 ${minItemWidth}px`,
                minWidth: minItemWidth,
                maxWidth: maxItemWidth,
                height: itemHeight,
                flexShrink: 0,
                background: getTemplateTileBackground(badge),
                borderRadius: itemBorderRadius,
                padding: `${templatePadding[item.i] ?? paddingY}px ${templatePadding[item.i] ?? paddingX}px`,
                boxSizing: 'border-box',
                overflow: 'hidden',
                cursor: editMode ? (isDragging ? 'grabbing' : 'grab') : 'default',
                opacity: isDragging ? 0.35 : 1,
                outline: isDropTarget ? '2px dashed #4a90d9' : undefined,
                outlineOffset: -2,
                transition: 'opacity 0.15s, outline 0.1s',
              }}
            >
              <TemplateBadge settings={badge} />
              {t ? (
                <img
                  src={t.src}
                  alt={t.name}
                  draggable={false}
                  style={{
                    width: '100%',
                    height: innerH > 0 ? innerH : '100%',
                    objectFit: templateObjectFit[item.i] ?? 'contain',
                    display: 'block',
                    borderRadius: Math.max(0, itemBorderRadius - 2),
                  }}
                />
              ) : (
                <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', fontSize: 11, color: '#aaa' }}>
                  {item.i}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
