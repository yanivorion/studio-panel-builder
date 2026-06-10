import { initBuiltinGroupLayouts } from './builtinGroupDefaults.js';
import { initCategoryGroupLayouts } from './categoryGroupDefaults.js';

/** Initialize preview + subgroup layouts for built-in home groups and app category groups */
export function initAllGroupLayouts(groups, templates, createLayoutState, canvasWidth = 440) {
  const builtinLayouts = initBuiltinGroupLayouts(groups, templates, createLayoutState);
  const categoryLayouts = initCategoryGroupLayouts(groups, templates, createLayoutState, canvasWidth);
  return { ...builtinLayouts, ...categoryLayouts };
}
