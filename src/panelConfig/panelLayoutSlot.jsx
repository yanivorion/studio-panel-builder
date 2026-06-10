import React, { useMemo } from 'react';
import { GroupLayoutSlot } from '../layoutBuilder/GroupLayoutSlot.jsx';
import { normalizeGroupLayout } from '../services/panelLayoutCompact.js';
import { tokens } from '../ui/tokens.js';
import { isBuiltinGroup, layoutKey } from './panelStructure.js';

const noopLayoutChange = () => {};

const PANEL_W = tokens.panelW;
const SIDEBAR_W = tokens.panelSidebarW;

export function createGetLayoutSlot({
  groupLayouts,
  templatesById,
  groups = null,
  editMode = false,
  activeGroupId = null,
  layoutLayer = 'preview',
  onLayoutChange = null,
  /** When true, built-in groups only use layout slots if explicitly seeded */
  requireExplicitSeed = false,
}) {
  const contentAreaWidth = PANEL_W - SIDEBAR_W;

  return function getLayoutSlot(groupId, layer) {
    const key = layoutKey(groupId, layer);
    const rawLayout = groupLayouts?.[key];
    if (!rawLayout) return null;
    const layout = normalizeGroupLayout(rawLayout);

    if (!layout.layoutSeeded) return null;

    const group = groups?.find(g => g.id === groupId);
    if (requireExplicitSeed && isBuiltinGroup(group)) {
      return null;
    }

    const bp = layout.gridEngine?.breakpoints?.find(
      b => b.key === layout.activeBreakpointKey,
    );
    const hasItems = (bp?.items?.length ?? 0) > 0;
    if (!hasItems) return null;

    const canvasWidth = Math.max(100, contentAreaWidth - (layout.containerPadding ?? 12) * 2);
    const isLiveSlot = activeGroupId === groupId && layoutLayer === layer;
    const isEditing = editMode && isLiveSlot && !!onLayoutChange;
    const bpItems = bp?.items ?? [];
    const templateSig = bpItems
      .map(item => templatesById[item.i]?.src ?? item.i)
      .join('|');

    return (
      <GroupLayoutSlot
        key={`${key}-${bpItems.length}-${bp?.galleryLayout}-${layout.containerPadding}-${layout.itemPaddingX}-${layout.itemPaddingY}-${layout.itemBorderRadius}-${JSON.stringify(layout.templateScales)}-${bp?.collageSettings?.groupPattern}-${bp?.gridConfig?.margin?.[0]}-${templateSig}`}
        layoutState={layout}
        canvasWidth={canvasWidth}
        contentAreaWidth={contentAreaWidth}
        editMode={isEditing}
        templatesById={templatesById}
        onLayoutChange={isLiveSlot && onLayoutChange ? onLayoutChange : noopLayoutChange}
        emptyHint={layer === 'preview'
          ? 'Preview layout — seed a preset in the edit panel'
          : 'Subgroup layout — seed for the See more drill-in view'}
        minHeight={layer === 'preview' ? 80 : 200}
      />
    );
  };
}

export function usePanelLayoutSlot(options) {
  const {
    groupLayouts,
    templatesById,
    groups,
    editMode,
    activeGroupId,
    layoutLayer,
    onLayoutChange,
    requireExplicitSeed = false,
  } = options;

  return useMemo(
    () => createGetLayoutSlot({
      groupLayouts,
      templatesById,
      groups,
      editMode,
      activeGroupId,
      layoutLayer,
      onLayoutChange,
      requireExplicitSeed,
    }),
    [groupLayouts, templatesById, groups, editMode, activeGroupId, layoutLayer, onLayoutChange, requireExplicitSeed],
  );
}
