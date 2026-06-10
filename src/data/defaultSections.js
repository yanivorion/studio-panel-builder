/**
 * Default page sections — each holds a static image at 100% width, height auto.
 */

export const THALINA_SECTIONS = [
  {
    id: 'sec-header',
    label: 'Header',
    bg: '#F2F1EC',
    image: '/sites/thalina/header.png',
  },
  {
    id: 'sec-hero',
    label: 'Hero',
    bg: '#F2F1EC',
    image: '/sites/thalina/general.png',
  },
  {
    id: 'sec-general',
    label: 'General',
    bg: '#F2F1EC',
    image: '/sites/thalina/hero.png',
  },
];

export const DENNEL_SECTIONS = [
  {
    id: 'sec-header',
    label: 'Header',
    bg: '#ffffff',
    image: '/sites/dennel/header.png',
  },
  {
    id: 'sec-hero',
    label: 'Hero',
    bg: '#ffffff',
    image: '/sites/dennel/hero.png',
  },
  {
    id: 'sec-general',
    label: 'General',
    bg: '#ffffff',
    image: '/sites/dennel/general.png',
  },
];

export const SPRITZ_BERLIN_SECTIONS = [
  {
    id: 'sec-header',
    label: 'Header',
    bg: '#000000',
    image: '/sites/spritz-berlin/header.png',
  },
  {
    id: 'sec-hero',
    label: 'Hero',
    bg: '#000000',
    image: '/sites/spritz-berlin/hero.png',
  },
  {
    id: 'sec-general',
    label: 'General',
    bg: '#000000',
    image: '/sites/spritz-berlin/general.png',
  },
  {
    id: 'sec-event-card',
    label: 'Event Card',
    bg: '#000000',
    image: '/sites/spritz-berlin/event-card-frame.png',
    dock: 'bottom',
    marquee: {
      text: 'SPRITZ BERLIN   8 (AUG) 2035   DOORS OPEN 00:00',
      separator: '   ',
      backgroundColor: '#E50026',
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 16.8,
      letterSpacing: '0.04em',
      duration: 26,
      uppercase: true,
    },
  },
];

export const DEFAULT_SECTIONS = THALINA_SECTIONS;
