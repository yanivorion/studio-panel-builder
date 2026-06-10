import { DEFAULT_SECTIONS } from '../data/defaultSections.js';

const LEGACY_NAV_IDS = new Set(['sec-nav', 'sec-content']);

function isLegacyProject(sections = [], elements = []) {
  if (sections.some(s => LEGACY_NAV_IDS.has(s.id))) return true;
  if (elements.some(el => el.type === 'image' && el.w >= 1000)) return true;
  if (sections.length === 1 && (sections[0].backgroundImage || sections[0].id === 'sec-hero')) {
    return !sections[0].image;
  }
  return elements.some(el => {
    const text = el.props?.text || el.props?.label || '';
    return typeof text === 'string' && text.includes('ALPINE AURA');
  });
}

/** Normalize saved canvas — returns null to use DEFAULT_SECTIONS. */
export function normalizeSiteProject(saved, projectVersion) {
  if (!saved || saved.version !== projectVersion) return null;

  const sections = Array.isArray(saved.sections) ? saved.sections : [];
  const elements = Array.isArray(saved.elements) ? saved.elements : [];

  if (isLegacyProject(sections, elements)) {
    return {
      sections: DEFAULT_SECTIONS,
      elements: [],
      migrated: true,
      pages: saved.pages,
      currentPage: saved.currentPage,
    };
  }

  if (!sections.length) {
    return {
      sections: DEFAULT_SECTIONS,
      elements: [],
      migrated: true,
      pages: saved.pages,
      currentPage: saved.currentPage,
    };
  }

  // Migrate backgroundImage → image for older v5 saves
  const migratedSections = sections.map(s => {
    if (s.image) return s;
    if (!s.backgroundImage) return s;
    const { backgroundImage, backgroundSize, backgroundPosition, height, ...rest } = s;
    return { ...rest, image: backgroundImage };
  });

  return {
    sections: migratedSections,
    elements,
    pages: saved.pages,
    currentPage: saved.currentPage,
    migrated: migratedSections.some((s, i) => s !== sections[i]),
  };
}
