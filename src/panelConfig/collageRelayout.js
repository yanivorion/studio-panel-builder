import { autoSeedCollageRows } from '../layoutBuilder/builder/gridEngine';

/** Re-pack collage items when settings/scales/gap change so preview updates live */
export function relayoutCollageState(layoutState, templatesById, canvasWidth) {
  const bpKey = layoutState.activeBreakpointKey ?? 'bp-narrow';
  const bp = layoutState.gridEngine?.breakpoints?.find(b => b.key === bpKey);
  if (bp?.galleryLayout !== 'Collage') return layoutState;

  const ids = layoutState.orderedTemplateIds?.length
    ? layoutState.orderedTemplateIds
    : bp.items.map(i => i.i);
  if (!ids.length) return layoutState;

  const items = autoSeedCollageRows(
    ids,
    templatesById,
    canvasWidth,
    bp.gridConfig.margin[0],
    layoutState.itemPaddingX ?? 8,
    layoutState.itemPaddingY ?? 8,
    {
      targetRowHeight: bp.collageSettings?.targetRowHeight ?? 200,
      minItemSize: bp.collageSettings?.minItemSize ?? 80,
      groupPattern: bp.collageSettings?.groupPattern ?? '',
    },
    layoutState.templateScales ?? {},
  );

  return {
    ...layoutState,
    gridEngine: {
      ...layoutState.gridEngine,
      breakpoints: layoutState.gridEngine.breakpoints.map(b =>
        b.key === bpKey ? { ...b, items } : b,
      ),
    },
  };
}
