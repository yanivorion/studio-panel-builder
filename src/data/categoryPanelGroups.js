/**
 * Add Panel template groups — Stores, Events, Bookings, and element categories.
 * Each group = a labeled section in the panel (like Branded Elements on Home).
 * Items = template preview images for layout variants in that group.
 */

import { getContainerLayoutDef } from './containerLayoutPresets.js';

/** @typedef {{ paths: string[], previewPreset?: string, subgroupPreset?: string }} GroupTemplateConfig */

const STRIP = 'strip-horizontal';
const COLLAGE = 'collage-rows-2';

function tpl(id, name, categoryId, sortOrder, paths, previewPreset = STRIP) {
  const list = Array.isArray(paths) ? paths : [paths];
  return {
    id,
    name,
    categoryId,
    sortOrder,
    paths: list,
    previewPreset,
    subgroupPreset: previewPreset,
  };
}

/** Multi-slot container wireframe — thumb PNG for picker only; slots are placeholders */
function containerTpl(id, name, categoryId, sortOrder, layoutTemplateId, thumbPath) {
  return {
    id,
    name,
    categoryId,
    sortOrder,
    layoutTemplateId,
    thumbPath,
    paths: [],
    previewPreset: 'container-layout',
    subgroupPreset: 'container-layout',
  };
}

export const STORES_GROUPS = [
  tpl('grp-stores-grid-gallery', 'Grid gallery', 'stores', 0, '/panel/stores/grid-gallery.png'),
  tpl('grp-stores-slider-gallery', 'Slider gallery', 'stores', 1, '/panel/stores/slider-gallery.png'),
  tpl('grp-stores-related-products', 'Related products', 'stores', 2, '/panel/stores/related-products.png'),
  tpl('grp-stores-best-sellers', 'Best sellers', 'stores', 3, '/panel/stores/best-sellers.png'),
];

export const EVENTS_GROUPS = [
  tpl('grp-events-featured', 'Featured', 'events', 0, '/panel/events/featured.png'),
  tpl('grp-events-list', 'List', 'events', 1, [
    '/panel/events/list-3-column.png',
    '/panel/events/list-horizontal.png',
    '/panel/events/list-alternating.png',
    '/panel/events/list-overlay.png',
  ], COLLAGE),
  tpl('grp-events-calendar', 'Calendar', 'events', 2, [
    '/panel/events/calendar-monthly.png',
    '/panel/events/calendar-weekly.png',
  ], COLLAGE),
];

export const BOOKINGS_GROUPS = [
  tpl('grp-bookings-featured-service', 'Featured service', 'bookings', 0, '/panel/bookings/featured-service.png'),
  tpl('grp-bookings-service-list', 'Service list', 'bookings', 1, [
    '/panel/bookings/service-list-cards.png',
    '/panel/bookings/service-list-rows.png',
  ], COLLAGE),
  tpl('grp-bookings-daily-agenda', 'Daily agenda', 'bookings', 2, [
    '/panel/bookings/daily-agenda-cards.png',
    '/panel/bookings/daily-agenda-list.png',
  ], COLLAGE),
  tpl('grp-bookings-calendar', 'Calendar', 'bookings', 3, '/panel/bookings/calendar.png'),
  tpl('grp-bookings-cart-icon', 'Cart icon', 'bookings', 4, '/panel/bookings/cart-icon.png'),
  tpl('grp-bookings-related-apps', 'Related apps', 'bookings', 5, '/panel/bookings/related-apps.png'),
];

export const TEXT_GROUPS = [
  tpl('grp-text-standard-titles', 'Standard titles', 'text', 0, '/panel/text/standard-titles.png'),
  tpl('grp-text-title', 'Title', 'text', 1, '/panel/text/title.png'),
  tpl('grp-text-paragraph', 'Paragraph', 'text', 2, '/panel/text/paragraph.png'),
  tpl('grp-text-collapsible', 'Collapsible text', 'text', 3, '/panel/text/collapsible-text.png'),
  tpl('grp-text-running', 'Running text', 'text', 4, '/panel/text/running-text.png'),
  tpl('grp-text-mask', 'Text mask', 'text', 5, '/panel/text/text-mask.png'),
  tpl('grp-text-on-path', 'Text on path', 'text', 6, '/panel/text/text-on-path.png'),
  tpl('grp-text-effects', 'Text effects', 'text', 7, '/panel/text/text-effects.png'),
  tpl('grp-text-particles', 'Text particles', 'text', 8, '/panel/text/text-particles.png'),
  tpl('grp-text-combos', 'Text combos', 'text', 9, '/panel/text/text-combos.png'),
];

export const IMAGE_GROUPS = [
  tpl('grp-image-site-files', 'Site files', 'image', 0, '/panel/image/site-files.png'),
  tpl('grp-image-photos', 'Photos', 'image', 1, '/panel/image/photos.png'),
  tpl('grp-image-gallery', 'Gallery', 'image', 2, '/panel/image/gallery.png'),
  tpl('grp-image-illustrations', 'Illustrations', 'image', 3, '/panel/image/illustrations.png'),
  tpl('grp-image-cutout', 'Cutout', 'image', 4, '/panel/image/cutout.png'),
];

export const BUTTON_GROUPS = [
  tpl('grp-button-branded', 'Branded', 'button', 0, '/panel/button/branded.png'),
  tpl('grp-button-buttons', 'Buttons', 'button', 1, '/panel/button/buttons.png'),
  tpl('grp-button-animated', 'Animated buttons', 'button', 2, '/panel/button/animated-buttons.png'),
  tpl('grp-button-social-bar', 'Social bar', 'button', 3, '/panel/button/social-bar.png'),
  tpl('grp-button-share', 'Share buttons', 'button', 4, '/panel/button/share-buttons.png'),
  tpl('grp-button-pay', 'Pay buttons', 'button', 5, '/panel/button/pay-buttons.png'),
];

export const GRAPHICS_GROUPS = [
  tpl('grp-graphics-site-logo', 'Site logo', 'graphics', 0, '/panel/graphics/site-logo.png'),
  tpl('grp-graphics-lines', 'Lines', 'graphics', 1, '/panel/graphics/lines.png'),
  tpl('grp-graphics-basic-shapes', 'Basic shapes', 'graphics', 2, '/panel/graphics/basic-shapes.png'),
  tpl('grp-graphics-icons', 'Icons', 'graphics', 3, '/panel/graphics/icons.png'),
  tpl('grp-graphics-text-mask', 'Text mask', 'graphics', 4, '/panel/graphics/text-mask.png'),
  tpl('grp-graphics-vector-art', 'Vector art', 'graphics', 5, '/panel/graphics/vector-art.png'),
  tpl('grp-graphics-vector-collections', 'Vector art collections', 'graphics', 6, '/panel/graphics/vector-art-collections.png'),
  tpl('grp-graphics-stickers', 'Stickers', 'graphics', 7, '/panel/graphics/stickers.png'),
  tpl('grp-graphics-text-effects', 'Text effects', 'graphics', 8, '/panel/graphics/text-effects.png'),
  tpl('grp-graphics-transparent-video', 'Transparent video', 'graphics', 9, '/panel/graphics/transparent-video.png'),
];

export const BOX_GROUPS = [
  tpl('grp-box-branded', 'Branded', 'box', 0, '/panel/box/branded.png'),
  tpl('grp-box-empty', 'Empty', 'box', 1, '/panel/box/empty.png'),
  tpl('grp-box-designed-1', 'Designed boxes', 'box', 2, '/panel/box/designed-boxes-1.png'),
  tpl('grp-box-designed-2', 'Designed boxes', 'box', 3, '/panel/box/designed-boxes-2.png'),
  tpl('grp-box-multi-state', 'Multi-state box', 'box', 4, '/panel/box/multi-state-box.png'),
];

export const LAYOUT_TOOLS_GROUPS = [
  tpl('grp-layout-sections-grids', 'Sections grids', 'layout-tools', 0, '/panel/layout-tools/sections-grids.png'),
  tpl('grp-layout-repeaters', 'Repeaters', 'layout-tools', 1, '/panel/layout-tools/repeaters.png'),
  tpl('grp-layout-accordion', 'Accordion', 'layout-tools', 2, '/panel/layout-tools/accordion.png'),
  tpl('grp-layout-slideshow-repeater', 'Slideshow repeater', 'layout-tools', 3, '/panel/layout-tools/slideshow-repeater.png'),
  tpl('grp-layout-tabs', 'Tabs', 'layout-tools', 4, '/panel/layout-tools/tabs.png'),
  tpl('grp-layout-stacks', 'Stacks', 'layout-tools', 5, '/panel/layout-tools/stacks.png'),
  tpl('grp-layout-tables', 'Tables', 'layout-tools', 6, '/panel/layout-tools/tables.png'),
  tpl('grp-layout-css-grid', 'CSS grid', 'layout-tools', 7, '/panel/layout-tools/css-grid.png'),
  containerTpl('grp-layout-container-split-3', 'Split columns', 'layout-tools', 8, 'container-split-3', '/panel/layout-tools/container-split-3.png'),
  containerTpl('grp-layout-container-stagger-4', 'Staggered grid', 'layout-tools', 9, 'container-stagger-4', '/panel/layout-tools/container-stagger-4.png'),
  containerTpl('grp-layout-container-masonry-7', 'Masonry grid', 'layout-tools', 10, 'container-masonry-7', '/panel/layout-tools/container-masonry-7.png'),
  containerTpl('grp-layout-container-bento-5', 'Bento grid', 'layout-tools', 11, 'container-bento-5', '/panel/layout-tools/container-bento-5.png'),
  containerTpl('grp-layout-container-grid-2x3', 'Grid 2×3', 'layout-tools', 12, 'container-grid-2x3', '/panel/layout-tools/container-grid-2x3.png'),
];

export { CONTAINER_LAYOUT_LIBRARY } from './containerLayoutPresets.js';

export const VIDEO_GROUPS = [
  tpl('grp-video-videos', 'Videos', 'video', 0, '/panel/video/videos.png'),
  tpl('grp-video-social-player', 'Social video player', 'video', 1, '/panel/video/social-video-player.png'),
  tpl('grp-video-mini-players', 'Mini players', 'video', 2, '/panel/video/mini-players.png'),
  tpl('grp-video-transparent', 'Transparent video', 'video', 3, '/panel/video/transparent-video.png'),
];

export const FORM_GROUPS = [
  tpl('grp-form-forms', 'Forms', 'form', 0, '/panel/form/forms.png'),
  tpl('grp-form-faq', 'FAQ', 'form', 1, '/panel/form/faq.png'),
  tpl('grp-form-google-maps', 'Google maps', 'form', 2, '/panel/form/google-maps.png'),
  tpl('grp-form-smart-chat', 'Smart chat', 'form', 3, '/panel/form/smart-chat.png'),
];

export const MENU_GROUPS = [
  tpl('grp-menu-horizontal', 'Horizontal menu', 'menu', 0, '/panel/menu/horizontal-menu.png'),
  tpl('grp-menu-hamburger', 'Hamburger menu', 'menu', 1, '/panel/menu/hamburger-menu.png'),
  tpl('grp-menu-vertical', 'Vertical menu', 'menu', 2, '/panel/menu/vertical-menu.png'),
  tpl('grp-menu-anchor', 'Anchor menu', 'menu', 3, '/panel/menu/anchor-menu.png'),
  tpl('grp-menu-breadcrumbs', 'Breadcrumbs', 'menu', 4, '/panel/menu/breadcrumbs.png'),
  tpl('grp-menu-pagination', 'Pagination', 'menu', 5, '/panel/menu/pagination.png'),
  tpl('grp-menu-site-search', 'Site search', 'menu', 6, '/panel/menu/site-search.png'),
];

export const POPUP_GROUPS = [
  tpl('grp-popup-lightbox', 'Lightbox', 'popup', 0, '/panel/popup/lightbox.png'),
];

export const GALLERY_GROUPS = [
  tpl('grp-gallery-gallery', 'Gallery', 'gallery', 0, '/panel/gallery/gallery.png'),
  tpl('grp-gallery-slideshow', 'Slideshow', 'gallery', 1, '/panel/gallery/slideshow.png'),
  tpl('grp-gallery-instagram', 'Instagram feed', 'gallery', 2, '/panel/gallery/instagram-feed.png'),
];

export const SOCIAL_GROUPS = [
  tpl('grp-social-share', 'Share buttons', 'social', 0, '/panel/social/share-buttons.png'),
  tpl('grp-social-instagram', 'Instagram feed', 'social', 1, '/panel/social/instagram-feed.png'),
  tpl('grp-social-video-player', 'Social video player', 'social', 2, '/panel/social/social-video-player.png'),
  tpl('grp-social-bar', 'Social bar', 'social', 3, '/panel/social/social-bar.png'),
];

/** Categories that use template preview groups instead of element catalog */
export const TEMPLATE_CATEGORY_IDS = [
  'stores', 'events', 'bookings',
  'text', 'image', 'button', 'graphics', 'box', 'layout-tools', 'video', 'form', 'menu', 'popup', 'gallery', 'social',
];

export const PANEL_TEMPLATE_GROUPS = [
  ...STORES_GROUPS,
  ...EVENTS_GROUPS,
  ...BOOKINGS_GROUPS,
  ...TEXT_GROUPS,
  ...IMAGE_GROUPS,
  ...BUTTON_GROUPS,
  ...GRAPHICS_GROUPS,
  ...BOX_GROUPS,
  ...LAYOUT_TOOLS_GROUPS,
  ...VIDEO_GROUPS,
  ...FORM_GROUPS,
  ...MENU_GROUPS,
  ...POPUP_GROUPS,
  ...GALLERY_GROUPS,
  ...SOCIAL_GROUPS,
];

/** @deprecated use PANEL_TEMPLATE_GROUPS */
export const APP_CATEGORY_GROUPS = PANEL_TEMPLATE_GROUPS;

/** Flat list of all category template asset paths */
export const CATEGORY_PANEL_PATHS = [
  ...new Set(PANEL_TEMPLATE_GROUPS.flatMap(g => g.paths)),
];

export const GROUP_CONFIG_BY_ID = Object.fromEntries(
  PANEL_TEMPLATE_GROUPS.map(g => [g.id, g]),
);

export function isStaticTemplateGroup(group) {
  return Boolean(group?.id && GROUP_CONFIG_BY_ID[group.id]);
}

export function getCategoryGroupConfig(groupId, group = null) {
  if (groupId && GROUP_CONFIG_BY_ID[groupId]) {
    const config = GROUP_CONFIG_BY_ID[groupId];
    if (config.layoutTemplateId && config.thumbPath) {
      return { ...config, paths: [config.thumbPath] };
    }
    return config;
  }
  if (group?.layoutTemplateId) {
    const def = getContainerLayoutDef(group.layoutTemplateId);
    return {
      id: group.id,
      name: group.name,
      categoryId: group.categoryId,
      layoutTemplateId: group.layoutTemplateId,
      paths: def?.thumbPath ? [def.thumbPath] : [],
      previewPreset: 'container-layout',
      subgroupPreset: 'container-layout',
    };
  }
  if (group?.templatePaths?.length) {
    return {
      id: group.id,
      name: group.name,
      categoryId: group.categoryId,
      paths: group.templatePaths,
      previewPreset: group.previewPreset ?? STRIP,
      subgroupPreset: group.subgroupPreset ?? group.previewPreset ?? STRIP,
    };
  }
  return null;
}

export function isCategoryPanelGroup(group) {
  if (!group?.id) return false;
  if (GROUP_CONFIG_BY_ID[group.id]) return true;
  if (group.layoutTemplateId) return true;
  return group.kind === 'templates'
    && Array.isArray(group.templatePaths)
    && group.templatePaths.length > 0;
}
