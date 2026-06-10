import { applyPreset } from '../layoutBuilder/builder/gridEngine';
import { relayoutCollageState } from './collageRelayout.js';

/** Re-apply preset when Grid/Masonry config changes so preview updates live */
export function relayoutGridMasonryState(layoutState, templates, canvasWidth) {
  const bpKey = layoutState.activeBreakpointKey ?? 'bp-narrow';
  const bp = layoutState.gridEngine?.breakpoints?.find(b => b.key === bpKey);
  if (!bp || (bp.galleryLayout !== 'Grid' && bp.galleryLayout !== 'Masonry')) {
    return layoutState;
  }

  const ids = layoutState.orderedTemplateIds?.length
    ? layoutState.orderedTemplateIds
    : bp.items.map(i => i.i);
  if (!ids.length) return layoutState;

  const presetId = bp.presetId ?? (bp.galleryLayout === 'Masonry' ? 'masonry-2' : 'grid-2');
  const result = applyPreset(
    presetId,
    templates,
    ids,
    bp.gridConfig.cols,
    undefined,
    {
      containerWidth: canvasWidth,
      gap: bp.gridConfig.margin[0],
      rowHeight: bp.gridConfig.rowHeight,
    },
  );

  return {
    ...layoutState,
    gridEngine: {
      ...layoutState.gridEngine,
      breakpoints: layoutState.gridEngine.breakpoints.map(b =>
        b.key === bpKey
          ? {
              ...b,
              items: result.items,
              gridConfig: {
                ...b.gridConfig,
                ...(result.cols ? { cols: result.cols } : {}),
                ...(result.rowHeight ? { rowHeight: result.rowHeight } : {}),
              },
            }
          : b,
      ),
    },
  };
}

export function relayoutActiveLayout(layoutState, templates, templatesById, canvasWidth) {
  const bpKey = layoutState.activeBreakpointKey ?? 'bp-narrow';
  const bp = layoutState.gridEngine?.breakpoints?.find(b => b.key === bpKey);
  if (!bp) return layoutState;

  if (bp.galleryLayout === 'Collage') {
    return relayoutCollageState(layoutState, templatesById, canvasWidth);
  }
  if (bp.galleryLayout === 'Grid' || bp.galleryLayout === 'Masonry') {
    return relayoutGridMasonryState(layoutState, templates, canvasWidth);
  }
  return layoutState;
}
