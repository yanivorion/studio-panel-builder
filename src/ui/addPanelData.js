// Shared Add Panel data — used by AddPanel and Panel Edit Mode

export const DEFAULT_CATEGORIES = [
  { id: 'home',     label: 'Home' },
  { id: 'stores',   label: 'Stores' },
  { id: 'events',   label: 'Events' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'text',     label: 'Text' },
  { id: 'image',    label: 'Image' },
  { id: 'button',   label: 'Button' },
  { id: 'graphics', label: 'Graphics' },
  { id: 'box',          label: 'Box' },
  { id: 'layout-tools', label: 'Layout tools' },
  { id: 'video',        label: 'Video' },
  { id: 'form',     label: 'Form & Contact' },
  { id: 'menu',     label: 'Menu' },
  { id: 'popup',    label: 'Popup' },
  { id: 'gallery',  label: 'Gallery' },
  { id: 'social',   label: 'Social' },
  { id: 'code',     label: 'Code' },
];

export const ELEMENTS_BY_CAT = {
  text: [
    { id: 'heading',          label: 'Heading',          desc: 'Large display text' },
    { id: 'paragraph',        label: 'Paragraph',        desc: 'Body copy text' },
    { id: 'richtext',         label: 'Rich Text',        desc: 'Formatted text block' },
    { id: 'collapsible-text', label: 'Collapsible Text', desc: 'Expandable content' },
    { id: 'text-mask',        label: 'Text Mask',        desc: 'Image inside text' },
  ],
  image: [
    { id: 'image',      label: 'Image',           desc: 'Photo or graphic' },
    { id: 'image-mask', label: 'Image with Mask', desc: 'Shaped image' },
    { id: 'vector-art', label: 'Vector Art',      desc: 'SVG illustration' },
    { id: 'clip-art',   label: 'Clip Art',        desc: 'Graphics & stickers' },
  ],
  button: [
    { id: 'btn-fill',    label: 'Button',         desc: 'Filled action button' },
    { id: 'btn-outline', label: 'Outline Button', desc: 'Border-only button' },
    { id: 'btn-text',    label: 'Text Button',    desc: 'Text-only link' },
    { id: 'btn-icon',    label: 'Icon Button',    desc: 'Icon with label' },
  ],
  graphics: [
    { id: 'shape-rect',   label: 'Rectangle', desc: 'Filled rectangle' },
    { id: 'shape-circle', label: 'Circle',    desc: 'Ellipse or circle' },
    { id: 'shape-tri',    label: 'Triangle',  desc: 'Triangular shape' },
    { id: 'shape-line',   label: 'Line',      desc: 'Horizontal line' },
    { id: 'shape-arrow',  label: 'Arrow',     desc: 'Directional arrow' },
  ],
  box: [
    { id: 'container', label: 'Container', desc: 'Flexible layout box' },
    { id: 'stack',     label: 'Stack',     desc: 'Vertical / horizontal stack' },
    { id: 'grid',      label: 'Grid',      desc: 'CSS grid container' },
  ],
  'layout-tools': [
    { id: 'sections-grid', label: 'Sections grid', desc: 'Column & row section layouts' },
    { id: 'repeater',      label: 'Repeater',      desc: 'Repeated item list' },
    { id: 'accordion',     label: 'Accordion',     desc: 'Expand & collapse' },
    { id: 'slideshow',     label: 'Slideshow',     desc: 'Carousel repeater' },
    { id: 'tabs',          label: 'Tabs',          desc: 'Tabbed content areas' },
    { id: 'stacks',        label: 'Stacks',        desc: 'Stacked content blocks' },
    { id: 'table',         label: 'Table',         desc: 'Data table layout' },
    { id: 'css-grid',      label: 'CSS grid',      desc: 'Advanced grid layouts' },
  ],
  video: [
    { id: 'video-player',  label: 'Video Player',   desc: 'YouTube, Vimeo, custom' },
    { id: 'video-bg',      label: 'Video Background',desc: 'Looping background' },
    { id: 'video-gallery', label: 'Video Gallery',  desc: 'Collection of videos' },
  ],
  form: [
    { id: 'form',        label: 'Form',        desc: 'Contact / signup form' },
    { id: 'input-text',  label: 'Text Input',  desc: 'Single-line field' },
    { id: 'input-email', label: 'Email Input', desc: 'Email address field' },
    { id: 'checkbox',    label: 'Checkbox',    desc: 'True / false option' },
    { id: 'radio',       label: 'Radio Group', desc: 'Select one option' },
    { id: 'dropdown',    label: 'Dropdown',    desc: 'Select from list' },
    { id: 'subscribe',   label: 'Subscribe',   desc: 'Email subscribe form' },
  ],
  menu: [
    { id: 'nav-menu',    label: 'Navigation Menu', desc: 'Header nav links' },
    { id: 'anchor-menu', label: 'Anchor Menu',     desc: 'In-page scroll links' },
    { id: 'breadcrumbs', label: 'Breadcrumbs',     desc: 'Navigation trail' },
  ],
  popup: [
    { id: 'popup',    label: 'Popup',    desc: 'Overlay modal window' },
    { id: 'lightbox', label: 'Lightbox', desc: 'Media lightbox' },
  ],
  gallery: [
    { id: 'gallery-grid',    label: 'Grid Gallery', desc: 'Photo grid layout' },
    { id: 'gallery-slider',  label: 'Slider',       desc: 'Horizontal scroll' },
    { id: 'gallery-masonry', label: 'Masonry',      desc: 'Variable-height grid' },
    { id: 'gallery-3d',      label: '3D Gallery',   desc: 'Perspective gallery' },
  ],
  social: [
    { id: 'social-share', label: 'Share Buttons', desc: 'Social sharing links' },
    { id: 'social-icons', label: 'Social Icons',  desc: 'Platform icon set' },
    { id: 'like-button',  label: 'Like Button',   desc: 'Heart / thumbs-up' },
    { id: 'comments',     label: 'Comments',      desc: 'Reader comments section' },
  ],
  code: [
    { id: 'html-embed', label: 'HTML Embed', desc: 'Custom HTML & CSS' },
    { id: 'wix-app',    label: 'Wix App',    desc: 'App marketplace widget' },
  ],
};

export const APPS = [
  { id: 'blog',     label: 'Wix Blog',     desc: 'Create & manage blog posts',  icon: '📝' },
  { id: 'store',    label: 'Wix Stores',   desc: 'Sell products online',        icon: '🛍' },
  { id: 'bookings', label: 'Wix Bookings', desc: 'Let clients book services',   icon: '📅' },
  { id: 'events',   label: 'Wix Events',   desc: 'Create & sell event tickets', icon: '🎟' },
  { id: 'music',    label: 'Wix Music',    desc: 'Sell & stream your music',    icon: '🎵' },
  { id: 'forum',    label: 'Wix Forum',    desc: 'Community discussion board',  icon: '💬' },
  { id: 'members',  label: 'Members Area', desc: 'Password-protected pages',    icon: '👤' },
  { id: 'chat',     label: 'Wix Chat',     desc: 'Live chat with visitors',     icon: '🗨' },
];
