import { THALINA_SECTIONS, DENNEL_SECTIONS, SPRITZ_BERLIN_SECTIONS } from './defaultSections.js';

/** Order: 1 Thalina, 2 Dennel, 3 Spritz Berlin */
export const FLOW_IDS = ['thalina', 'dennel', 'spritz-berlin'];

export const DEFAULT_FLOW_PAGES = [
  { id: 'home', name: 'Home', isHome: true, group: 'main' },
  { id: 'about', name: 'About', group: 'main' },
  { id: 'contact', name: 'Contact', group: 'main' },
];

export const FLOWS = [
  {
    id: 'thalina',
    label: 'Thalina',
    description: 'Editorial salon',
    pages: DEFAULT_FLOW_PAGES,
    defaultSections: THALINA_SECTIONS,
  },
  {
    id: 'dennel',
    label: 'Dennel',
    description: 'Fine jewelry',
    pages: DEFAULT_FLOW_PAGES,
    defaultSections: DENNEL_SECTIONS,
  },
  {
    id: 'spritz-berlin',
    label: 'Spritz Berlin',
    description: 'Dark techno event',
    pages: DEFAULT_FLOW_PAGES,
    defaultSections: SPRITZ_BERLIN_SECTIONS,
  },
];

export function getFlow(id) {
  return FLOWS.find(f => f.id === id) ?? FLOWS[0];
}

export function defaultSiteForFlow(flowId) {
  const flow = getFlow(flowId);
  const pages = (flow.pages ?? DEFAULT_FLOW_PAGES).map(p => ({ ...p }));
  const homeId = pages.find(p => p.isHome)?.id ?? 'home';
  const pageData = {};

  pages.forEach(page => {
    if (page.id === homeId && flow.defaultSections.length) {
      pageData[page.id] = {
        sections: flow.defaultSections.map(s => ({ ...s })),
        elements: [],
      };
    } else {
      pageData[page.id] = { sections: [], elements: [] };
    }
  });

  return {
    pages,
    currentPage: homeId,
    pageData,
  };
}
