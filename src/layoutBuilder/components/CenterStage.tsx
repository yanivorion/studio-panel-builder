import React from 'react';
import { RglCanvas } from './RglCanvas';
import { CollageCanvas } from './CollageCanvas';
import { FlexCanvas } from './FlexCanvas';
import type { FlexSettings, GridLayoutItem, GridCompactor, LayoutBreakpoint, TemplateAsset } from '../builder/types';
import { DEFAULT_FLEX_SETTINGS } from '../builder/gridEngine';

interface CenterStageProps {
  panelWidth: number;
  panelHeight: number;
  canvasWidth: number;
  containerPadding: number;
  containerBackground: string;
  containerBorderRadius: number;
  itemPaddingX: number;
  itemPaddingY: number;
  itemBorderRadius: number;
  items: GridLayoutItem[];
  gridConfig: { cols: number; rowHeight: number; margin: [number, number] };
  compactor: GridCompactor;
  editMode: boolean;
  templatesById: Record<string, TemplateAsset>;
  templateScales: Record<string, number>;
  templateObjectFit: Record<string, import('../builder/types').TemplateObjectFit>;
  templatePadding: Record<string, number>;
  activeBreakpointKey: string;
  breakpoints: LayoutBreakpoint[];
  onPanelWidthChange: (w: number) => void;
  onLayoutChange: (items: GridLayoutItem[]) => void;
}

export const CenterStage: React.FC<CenterStageProps> = ({
  panelWidth,
  panelHeight,
  canvasWidth,
  containerPadding,
  containerBackground,
  containerBorderRadius,
  itemPaddingX,
  itemPaddingY,
  itemBorderRadius,
  items,
  gridConfig,
  compactor,
  editMode,
  templatesById,
  templateScales,
  templateObjectFit,
  templatePadding,
  activeBreakpointKey,
  breakpoints,
  onPanelWidthChange,
  onLayoutChange,
}) => {
  const activeBp = breakpoints.find(bp => bp.key === activeBreakpointKey);

  return (
    <main className="lb-center">

      {/* ── Top bar: width slider + breakpoint indicator ──── */}
      <div className="cs-topbar">
        <div className="cs-slider-wrap">
          <span className="cs-slider-label">Width</span>
          <input
            type="range"
            min={300}
            max={800}
            step={1}
            value={panelWidth}
            className="cs-slider"
            onChange={e => onPanelWidthChange(Number(e.target.value))}
          />
          <span className="cs-slider-value">{panelWidth}px</span>
        </div>

        <div className="cs-bp-chips">
          {breakpoints.map(bp => (
            <div
              key={bp.key}
              className={`cs-bp-chip${bp.key === activeBreakpointKey ? ' active' : ''}`}
            >
              {bp.label} <span>{bp.minWidth}px+</span>
            </div>
          ))}
        </div>

        <div className="cs-mode-badge">
          {editMode ? (
            <span className="cs-badge cs-badge-edit">
              {activeBp?.galleryLayout === 'Collage'
                ? 'Collage — row equalizer, drag to rearrange'
                : activeBp?.galleryLayout === 'Masonry'
                ? 'Masonry — drag to reorder'
                : activeBp?.galleryLayout === 'Flex'
                ? 'Flex — auto-fill (view only)'
                : 'Grid — drag to reorder'}
            </span>
          ) : (
            <span className="cs-badge cs-badge-view">View only</span>
          )}
        </div>
      </div>

      {/* ── Viewport: panel frame centred in the stage ───── */}
      <div className="cs-viewport">
        <div
          className="cs-panel-frame"
          style={{
            width: panelWidth,
            maxHeight: panelHeight,
            background: containerBackground,
            borderRadius: containerBorderRadius,
            padding: containerPadding,
          }}
        >
          {/* Panel header chrome */}
          <div className="cs-panel-header">
            <div className="cs-panel-dots">
              <span /><span /><span />
            </div>
            <div className="cs-panel-title">
              Add Panel
              {activeBp && (
                <span className="cs-panel-bp-tag">
                  {activeBp.label} · {activeBp.galleryLayout}
                </span>
              )}
            </div>
          </div>

          {/* Canvas */}
          <div className="cs-panel-canvas" style={{ overflowY: 'auto', overflowX: 'hidden', maxHeight: panelHeight - 48 }}>
            {items.length === 0 ? (
              <div className="cs-empty-state">
                <p>No items.</p>
                <p>Choose a subgroup and seed a layout preset.</p>
              </div>
            ) : activeBp?.galleryLayout === 'Collage' ? (
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
                editMode={editMode}
                onLayoutChange={onLayoutChange}
            />
            ) : activeBp?.galleryLayout === 'Flex' ? (
              <FlexCanvas
                items={items}
                containerWidth={canvasWidth}
                gap={gridConfig.margin[0]}
                paddingX={itemPaddingX}
                paddingY={itemPaddingY}
                itemBorderRadius={itemBorderRadius}
                templatesById={templatesById}
                flexSettings={activeBp.flexSettings ?? DEFAULT_FLEX_SETTINGS}
                templateObjectFit={templateObjectFit}
                templatePadding={templatePadding}
                editMode={editMode}
                onLayoutChange={onLayoutChange}
            />
            ) : (
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
                onLayoutChange={onLayoutChange}
            />
            )}
          </div>
        </div>

        {/* Ruler under panel */}
        <div className="cs-ruler" style={{ width: panelWidth }}>
          <div className="cs-ruler-line" />
          <span className="cs-ruler-label">{panelWidth}px</span>
          <div className="cs-ruler-line" />
        </div>
      </div>

    </main>
  );
};
