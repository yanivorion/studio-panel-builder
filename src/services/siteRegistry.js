import {
  DEFAULT_FLOW_PAGES,
  FLOW_IDS,
  FLOWS,
  getFlow,
  defaultSiteForFlow,
} from '../data/flows.js';
import { DEFAULT_PRESET_ID } from './panelRouting.js';

/** Blank starter canvas for user-created sites. */
export const BLANK_HOME_SECTIONS = [
  { id: 'sec-hero', label: 'Hero', bg: '#F2F1EC', height: 480 },
];

export function slugSiteId(name, takenIds = new Set()) {
  const base = String(name ?? 'site')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'site';

  let id = base;
  let n = 2;
  while (takenIds.has(id) || FLOW_IDS.includes(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

export function getCustomSites(session) {
  return Array.isArray(session?.customSites) ? session.customSites : [];
}

export function getAllSiteIds(session) {
  const customIds = getCustomSites(session).map(s => s.id);
  const flowIds = Object.keys(session?.flows ?? {});
  return [...new Set([...FLOW_IDS, ...customIds, ...flowIds])];
}

/** Site list for UI — built-in demos + user-created sites. */
export function getAllSites(session) {
  const custom = getCustomSites(session);
  const builtin = FLOWS.map(f => ({ ...f, builtIn: true }));
  const customUi = custom.map(s => ({
    id: s.id,
    label: s.label,
    description: s.description ?? '',
    pages: s.pages ?? DEFAULT_FLOW_PAGES,
    defaultSections: s.defaultSections ?? BLANK_HOME_SECTIONS,
    builtIn: false,
  }));
  return [...builtin, ...customUi];
}

export function resolveSiteMeta(session, siteId) {
  const custom = getCustomSites(session).find(s => s.id === siteId);
  if (custom) {
    return {
      id: custom.id,
      label: custom.label,
      description: custom.description ?? '',
      pages: custom.pages ?? DEFAULT_FLOW_PAGES,
      defaultSections: custom.defaultSections ?? BLANK_HOME_SECTIONS,
      builtIn: false,
    };
  }
  const builtIn = getFlow(siteId);
  return { ...builtIn, builtIn: true };
}

export function defaultSiteForSiteMeta(meta) {
  if (meta?.builtIn !== false) {
    return defaultSiteForFlow(meta?.id ?? 'thalina');
  }

  const pages = (meta.pages ?? DEFAULT_FLOW_PAGES).map(p => ({ ...p }));
  const homeId = pages.find(p => p.isHome)?.id ?? 'home';
  const pageData = {};

  pages.forEach(page => {
    if (page.id === homeId) {
      pageData[page.id] = {
        sections: (meta.defaultSections ?? BLANK_HOME_SECTIONS).map(s => ({ ...s })),
        elements: [],
      };
    } else {
      pageData[page.id] = { sections: [], elements: [] };
    }
  });

  return { pages, currentPage: homeId, pageData };
}

export function ensurePanelRoutingForSites(routing, siteIds) {
  const next = { ...(routing ?? {}) };
  siteIds.forEach(id => {
    if (!next[id]) {
      next[id] = { default: DEFAULT_PRESET_ID, pages: {} };
    }
  });
  return next;
}

export function ensureSitesInSession(session) {
  const siteIds = getAllSiteIds(session);
  const next = {
    ...session,
    customSites: getCustomSites(session),
    flows: { ...(session?.flows ?? {}) },
    panelState: session?.panelState
      ? {
        ...session.panelState,
        routing: ensurePanelRoutingForSites(session.panelState.routing, siteIds),
      }
      : session?.panelState,
  };

  siteIds.forEach(siteId => {
    if (!next.flows[siteId]?.site) {
      const meta = resolveSiteMeta(next, siteId);
      next.flows[siteId] = { site: defaultSiteForSiteMeta(meta) };
    }
  });

  return next;
}

/**
 * Add a user-created site to the session.
 * @returns {{ session: object, siteId: string, site: object }}
 */
export function addSiteToSession(session, { label, description = '' }) {
  const trimmed = label?.trim();
  if (!trimmed) throw new Error('Site name is required');

  const taken = new Set(getAllSiteIds(session));
  const id = slugSiteId(trimmed, taken);
  const meta = {
    id,
    label: trimmed,
    description: description?.trim() ?? '',
    pages: DEFAULT_FLOW_PAGES,
    defaultSections: BLANK_HOME_SECTIONS,
  };

  const customSites = [...getCustomSites(session), meta];
  let next = {
    ...session,
    customSites,
    flows: {
      ...(session?.flows ?? {}),
      [id]: { site: defaultSiteForSiteMeta(meta) },
    },
  };

  if (next.panelState) {
    next = {
      ...next,
      panelState: {
        ...next.panelState,
        routing: ensurePanelRoutingForSites(next.panelState.routing, [id]),
      },
    };
  }

  next = ensureSitesInSession(next);

  return { session: next, siteId: id, site: meta };
}

export function findSiteLabel(session, siteId) {
  return resolveSiteMeta(session, siteId).label ?? siteId;
}
