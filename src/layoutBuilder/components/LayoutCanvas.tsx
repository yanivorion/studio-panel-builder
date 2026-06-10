import React from 'react';
import { RglCanvas } from './RglCanvas';
import { CollageCanvas } from './CollageCanvas';
import { FlexCanvas } from './FlexCanvas';
import type { FlexSettings, GridLayoutItem, GridCompactor, LayoutBreakpoint, TemplateAsset, TemplateBadgeSettings, TemplateObjectFit } from '../builder/types';
import { DEFAULT_FLEX_SETTINGS } from '../builder/gridEngine';

interface LayoutCanvasProps {
  items: GridLayoutItem[];
  canvasWidth: number;
  gridConfig: { cols: number; rowHeight: number; margin: [number, number] };
  compactor: GridCompactor;
  editMode: boolean;
  templatesById: Record<string, TemplateAsset>;
  templateScales: Record<string, number>;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  templateBadges?: Record<string, TemplateBadgeSettings> | null;
  itemPaddingX: number;
  itemPaddingY: number;
  itemBorderRadius: number;
  activeBreakpoint: LayoutBreakpoint | null;
  onLayoutChange: (items: GridLayoutItem[]) => void;
  emptyHint?: string;
}

export const LayoutCanvas: React.FC<LayoutCanvasProps> = ({
  items,
  canvasWidth,
  gridConfig,
  compactor,
  editMode,
  templatesById,
  templateScales,
  templateObjectFit,
  templatePadding,
  templateBadges,
  itemPaddingX,
  itemPaddingY,
  itemBorderRadius,
  activeBreakpoint,
  onLayoutChange,
  emptyHint = 'Upload images or seed a preset to build this zone.',
}) => {
  if (items.length === 0) {
    return (
      <div className="cs-empty-state" style={{ minHeight: 200 }}>
        <p>No items in this zone.</p>
        <p>{emptyHint}</p>
      </div>
    );
  }

  if (activeBreakpoint?.galleryLayout === 'Collage') {
    return (
      <CollageCanvas
        items={items}
        containerWidth={canvasWidth}
        gap={gridConfig.margin[0]}
        paddingX={itemPaddingX}
        paddingY={itemPaddingY}
        itemBorderRadius={itemBorderRadius}
        templatesById={templatesById}
        templateScales={templateScales}
        templateObjectFit={templateObjectFit}
        templatePadding={templatePadding}
        templateBadges={templateBadges}
        editMode={editMode}
        onLayoutChange={onLayoutChange}
      />
    );
  }

  if (activeBreakpoint?.galleryLayout === 'Flex') {
    return (
      <FlexCanvas
        items={items}
        containerWidth={canvasWidth}
        gap={gridConfig.margin[0]}
        paddingX={itemPaddingX}
        paddingY={itemPaddingY}
        itemBorderRadius={itemBorderRadius}
        templatesById={templatesById}
        flexSettings={activeBreakpoint.flexSettings ?? DEFAULT_FLEX_SETTINGS}
        templateObjectFit={templateObjectFit}
        templatePadding={templatePadding}
        templateBadges={templateBadges}
        editMode={editMode}
        onLayoutChange={onLayoutChange}
      />
    );
  }

  return (
    <RglCanvas
      width={canvasWidth}
      items={items}
      cols={gridConfig.cols}
      rowHeight={gridConfig.rowHeight}
      margin={gridConfig.margin}
      compactor={compactor}
      editMode={editMode}
      templatesById={templatesById}
      itemPaddingX={itemPaddingX}
      itemPaddingY={itemPaddingY}
      itemBorderRadius={itemBorderRadius}
      templateObjectFit={templateObjectFit}
      templatePadding={templatePadding}
      templateBadges={templateBadges}
      onLayoutChange={onLayoutChange}
    />
  );
};
