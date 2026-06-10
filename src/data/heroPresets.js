/**
 * Site layout presets — each is a set of image sections (100% width, height auto).
 */

import { THALINA_SECTIONS } from './defaultSections.js';

export const SITE_TEMPLATES = [
  {
    id: 'thalina',
    label: 'Thalina',
    description: 'Header + Hero + General',
    tags: ['editorial', 'minimal'],
    preview: '/sites/thalina/hero.png',
    sections: THALINA_SECTIONS,
  },
];

/** @deprecated use SITE_TEMPLATES */
export const HERO_PRESETS = SITE_TEMPLATES;

export function getSiteTemplate(id) {
  return SITE_TEMPLATES.find(p => p.id === id) ?? null;
}

/** @deprecated */
export function getHeroPreset(id) {
  return getSiteTemplate(id);
}
