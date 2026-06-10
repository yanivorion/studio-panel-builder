import React, { useMemo } from 'react';
import { LayoutCanvas } from './components/LayoutCanvas';
import { withEffectiveGridConfig } from './builder/gridEngine';

export function GroupLayoutSlot({
  layoutState,
  canvasWidth,
  contentAreaWidth,
  editMode,
  templatesById,
  onLayoutChange,
  emptyHint = 'Seed a preset or upload to build this layout.',
  minHeight = 80,
}) {
  const gridEngine = layoutState?.gridEngine ?? { breakpoints: [] };
  const activeBreakpointKey = layoutState?.activeBreakpointKey ?? 'bp-narrow';
  const activeBreakpoint = useMemo(
    () => gridEngine.breakpoints.find(bp => bp.key === activeBreakpointKey) ?? null,
    [gridEngine.breakpoints, activeBreakpointKey],
  );

  const effectiveGridConfig = useMemo(
    () =>
      activeBreakpoint
        ? withEffectiveGridConfig(activeBreakpoint, contentAreaWidth)
        : { cols: 6, rowHeight: 100, margin: [12, 12] },
    [activeBreakpoint, contentAreaWidth],
  );

  const items = activeBreakpoint?.items ?? [];
  if (!items.length) {
    return (
      <div style={{
        minHeight,
        borderRadius: 8,
        border: '1px dashed rgba(255,255,255,0.12)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 12,
        fontSize: 11,
        color: 'rgba(255,255,255,0.35)',
        fontFamily: 'inherit',
      }}>
        {emptyHint}
      </div>
    );
  }

  const itemBorderRadius = layoutState?.itemBorderRadius ?? 10;

  return (
    <div style={{ minHeight, overflow: 'visible' }}>
      <LayoutCanvas
        items={items}
        canvasWidth={canvasWidth}
        gridConfig={effectiveGridConfig}
        compactor={activeBreakpoint?.compactor ?? 'vertical'}
        editMode={editMode}
        templatesById={templatesById}
        templateScales={layoutState?.templateScales ?? {}}
        templateObjectFit={layoutState?.templateObjectFit ?? {}}
        templatePadding={layoutState?.templatePadding ?? {}}
        templateBadges={layoutState?.templateBadges}
        itemPaddingX={layoutState?.itemPaddingX ?? 8}
        itemPaddingY={layoutState?.itemPaddingY ?? 8}
        itemBorderRadius={itemBorderRadius}
        activeBreakpoint={activeBreakpoint}
        onLayoutChange={onLayoutChange}
        emptyHint={emptyHint}
      />
    </div>
  );
}
