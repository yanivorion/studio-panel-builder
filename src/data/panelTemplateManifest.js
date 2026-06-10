import { CATEGORY_PANEL_PATHS } from './categoryPanelGroups.js';

/** Stable template IDs + paths for all default Add Panel assets */

export const HOME_PANEL_PATHS = [
  '/panel/photo-1.png',
  '/panel/photo-2.png',
  '/panel/photo-3.png',
  '/panel/photo-4.png',
  '/panel/photo-5.png',
  '/panel/sticker-cat.png',
  '/panel/sticker-house.png',
  '/panel/sticker-smarter.png',
  '/panel/sticker-bow.png',
  '/panel/sticker-newproject.png',
  '/panel/sticker-offer.png',
  '/panel/icon-upload.png',
  '/panel/icon-gen-image.png',
  '/panel/icon-gen-element.png',
  '/panel/brand-heading.png',
  '/panel/brand-btn-fill.png',
  '/panel/brand-box.png',
  '/panel/brand-line.png',
  '/panel/brand-btn-outline.png',
  '/panel/brand-para.png',
];

function pathToId(path) {
  return path
    .replace(/^\/panel\//, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** @type {{ id: string, path: string, name: string }[]} */
export const PANEL_TEMPLATE_MANIFEST = [
  ...HOME_PANEL_PATHS.map(path => ({
    id: `tpl-${pathToId(path)}`,
    path,
    name: path.split('/').pop(),
  })),
  ...CATEGORY_PANEL_PATHS.map(path => ({
    id: `tpl-${pathToId(path)}`,
    path,
    name: path.split('/').pop(),
  })),
];

export const ALL_PANEL_PATHS = PANEL_TEMPLATE_MANIFEST.map(t => t.path);
