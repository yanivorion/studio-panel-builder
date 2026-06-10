import { isBase44Backend } from './backend.js';
import {
  createPanelConfigRow,
  createSiteProjectRow,
  filterActivePanelConfig,
  filterActiveSiteProject,
  filterPanelConfig,
  updatePanelConfigRow,
  updateSiteProjectRow,
} from './base44Api.js';
import { panelConfigByteSize, PANEL_CONFIG_MAX_CHARS, preparePanelConfigForSave } from './panelConfigSerialize.js';
import { createDefaultPanelState, ensurePanelState, migrateLegacyFlowPanels, panelStateForRemoteSync, GLOBAL_PANEL_PAGE_ID } from './panelRouting.js';
import {
  ensureSitesInSession,
  getAllSiteIds,
  resolveSiteMeta,
  defaultSiteForSiteMeta,
} from './siteRegistry.js';
import { FLOW_IDS, defaultSiteForFlow, getFlow } from '../data/flows.js';
import { SPRITZ_BERLIN_SECTIONS, DENNEL_SECTIONS } from '../data/defaultSections.js';
import { buildPageData, getPageCanvas, mergePageCanvas } from './sitePageData.js';

export const SESSION_VERSION = 16;
const SESSION_STORAGE_KEY = 'studio-session-v11';
const SITE_PROJECT_NAME = 'studio-flows';

function readLocalSession() {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function pickNewerSession(a, b) {
  if (!a) return b ?? null;
  if (!b) return a;
  return (a.savedAt ?? 0) >= (b.savedAt ?? 0) ? a : b;
}

export function buildSessionPayload(session, activeFlowId) {
  return {
    ...session,
    activeFlowId,
    version: SESSION_VERSION,
    savedAt: Date.now(),
  };
}

export function flowPanelName(flowId, pageId) {
  return pageId ? `flow:${flowId}:${pageId}` : `flow:${flowId}`;
}

function buildEmptySession() {
  const base = {
    version: SESSION_VERSION,
    activeFlowId: 'thalina',
    customSites: [],
    panelState: createDefaultPanelState(),
    flows: {},
  };
  FLOW_IDS.forEach(id => {
    base.flows[id] = { site: defaultSiteForFlow(id) };
  });
  return ensureSitesInSession(base);
}

export function createDefaultSession() {
  return buildEmptySession();
}

function migrateSiteToPageData(site, flowId) {
  if (site?.pageData) return site;

  const flow = getFlow(flowId);
  const pages = site?.pages?.length ? site.pages : defaultSiteForFlow(flowId).pages;
  const homeId = pages.find(p => p.isHome)?.id ?? 'home';
  const currentId = site?.currentPage ?? homeId;
  const pageData = buildPageData(pages);

  if (site?.sections?.length || site?.elements?.length) {
    pageData[currentId] = {
      sections: site.sections ?? [],
      elements: site.elements ?? [],
    };
  } else if (flow.defaultSections.length) {
    pageData[homeId] = {
      sections: flow.defaultSections.map(s => ({ ...s })),
      elements: [],
    };
  }

  const { sections: _s, elements: _e, ...rest } = site ?? {};
  return { ...rest, pages, currentPage: currentId, pageData };
}

/** Swap Thalina hero/general images when still on the original assignment. */
function swapThalinaHeroGeneralImages(sections) {
  if (!sections?.length) return sections;

  const hero = sections.find(s => s.id === 'sec-hero');
  const general = sections.find(s => s.id === 'sec-general');
  if (!hero || !general) return sections;

  const heroImg = hero.image || hero.backgroundImage;
  const generalImg = general.image || general.backgroundImage;
  const isOriginal =
    heroImg === '/sites/thalina/hero.png' && generalImg === '/sites/thalina/general.png';

  if (!isOriginal) return sections;

  return sections.map(s => {
    if (s.id === 'sec-hero') return { ...s, image: '/sites/thalina/general.png', backgroundImage: null };
    if (s.id === 'sec-general') return { ...s, image: '/sites/thalina/hero.png', backgroundImage: null };
    return s;
  });
}

/**
 * One-time migration (v12): assign Dennel bundled assets when a section has no image
 * or still points at another flow's paths. Never overwrites user uploads or edits.
 */
function migrateDennelSectionImages(sections, defaults) {
  if (!sections?.length || !defaults?.length) return { sections, changed: false };
  const defaultById = Object.fromEntries(defaults.map(s => [s.id, s]));
  let changed = false;
  const next = sections.map(s => {
    const def = defaultById[s.id];
    if (!def?.image) return s;
    const current = s.image || s.backgroundImage;
    if (current?.startsWith('data:') || current?.startsWith('http')) return s;
    if (current?.startsWith('/sites/dennel/')) return s;
    if (!current || !current.startsWith('/sites/dennel/')) {
      changed = true;
      return { ...s, image: def.image, bg: def.bg ?? s.bg, backgroundImage: null };
    }
    return s;
  });
  return { sections: next, changed };
}

/** One-time v14: add running-text marquee + Frame 1 image on Spritz event card. */
function upgradeSpritzEventCardSection(sections) {
  const defaults = SPRITZ_BERLIN_SECTIONS.find(s => s.id === 'sec-event-card');
  if (!defaults?.marquee) return { sections, changed: false };

  let changed = false;
  const next = (sections ?? []).map(s => {
    if (s.id !== 'sec-event-card') return s;
    const current = s.image || s.backgroundImage;
    const needsImage = !current
      || current === '/sites/spritz-berlin/event-card.png'
      || current.endsWith('/event-card.png');
    const needsMarquee = !s.marquee;
    if (!needsImage && !needsMarquee) return s;
    changed = true;
    return {
      ...s,
      dock: s.dock ?? 'bottom',
      ...(needsImage ? { image: defaults.image, backgroundImage: null } : {}),
      ...(needsMarquee ? { marquee: { ...defaults.marquee } } : {}),
    };
  });
  return { sections: next, changed };
}

/** Apply default sections when a flow home page was saved empty but now has defaults. */
function backfillFlowDefaults(session) {
  const fromVersion = session?.version ?? 0;
  const next = { ...session, version: SESSION_VERSION, flows: { ...session.flows } };

  FLOW_IDS.forEach(flowId => {
    const flow = getFlow(flowId);
    let site = next.flows[flowId]?.site;

    if (!site) {
      next.flows[flowId] = { site: defaultSiteForFlow(flowId) };
      return;
    }

    site = migrateSiteToPageData(site, flowId);
    const homeId = site.pages?.find(p => p.isHome)?.id ?? 'home';
    const homeCanvas = getPageCanvas(site, homeId);

    if (!homeCanvas.sections?.length && flow.defaultSections.length) {
      site = mergePageCanvas(site, homeId, {
        sections: flow.defaultSections.map(s => ({ ...s })),
        elements: [],
      });
    }

    if (flowId === 'thalina') {
      const homeCanvas = getPageCanvas(site, homeId);
      const swapped = swapThalinaHeroGeneralImages(homeCanvas.sections ?? []);
      if (swapped !== homeCanvas.sections) {
        site = mergePageCanvas(site, homeId, { sections: swapped, elements: homeCanvas.elements ?? [] });
      }
    }

    if (flowId === 'dennel' && fromVersion < 12) {
      const homeCanvas = getPageCanvas(site, homeId);
      const refreshed = migrateDennelSectionImages(
        homeCanvas.sections ?? [],
        DENNEL_SECTIONS,
      );
      if (refreshed.changed) {
        site = mergePageCanvas(site, homeId, {
          sections: refreshed.sections,
          elements: homeCanvas.elements ?? [],
        });
      }
    }

    // Spritz: one-time upgrade 3-section layout → 4 sections with docked event card
    if (flowId === 'spritz-berlin' && fromVersion < 13) {
      const homeCanvas = getPageCanvas(site, homeId);
      const hasDocked = homeCanvas.sections?.some(s => s.dock === 'bottom' || s.id === 'sec-event-card');
      if (!hasDocked && SPRITZ_BERLIN_SECTIONS.length === 4) {
        site = mergePageCanvas(site, homeId, {
          sections: SPRITZ_BERLIN_SECTIONS.map(s => ({ ...s })),
          elements: homeCanvas.elements ?? [],
        });
      }
    }

    if (flowId === 'spritz-berlin' && fromVersion < 14) {
      const homeCanvas = getPageCanvas(site, homeId);
      const upgraded = upgradeSpritzEventCardSection(homeCanvas.sections ?? []);
      if (upgraded.changed) {
        site = mergePageCanvas(site, homeId, {
          sections: upgraded.sections,
          elements: homeCanvas.elements ?? [],
        });
      }
    }

    next.flows[flowId] = { ...next.flows[flowId], site };
  });

  next.panelState = ensurePanelState(next).panelState;
  next.customSites = Array.isArray(next.customSites) ? next.customSites : [];
  return ensureSitesInSession(next);
}

/** Attach panel routing state; legacy flowPanels merged on first v15 load. */
export function migratePanelState(session, legacyFlowPanels = null) {
  let next = ensurePanelState(session);
  if (legacyFlowPanels && (!session?.panelState || session.version < SESSION_VERSION)) {
    next = migrateLegacyFlowPanels(next, legacyFlowPanels);
  }
  return { ...next, version: SESSION_VERSION };
}

/** Migrate older saves into flow + per-page session shape. */
export function migrateToSession(saved) {
  if (!saved) return createDefaultSession();

  if (saved.version === SESSION_VERSION && saved.flows) {
    return backfillFlowDefaults(saved);
  }

  if (saved.flows) {
    return backfillFlowDefaults(ensurePanelState({ ...saved, version: SESSION_VERSION }));
  }

  const session = buildEmptySession();

  if (saved.sections || saved.pages) {
    session.flows.thalina.site = migrateSiteToPageData({
      pages: saved.pages ?? session.flows.thalina.site.pages,
      currentPage: saved.currentPage ?? 'home',
      sections: saved.sections ?? [],
      elements: saved.elements ?? [],
    }, 'thalina');
    session.activeFlowId = saved.activeFlowId ?? 'thalina';
  }

  return backfillFlowDefaults(session);
}


export async function loadFlowPanel(flowId, pageId) {
  const names = pageId
    ? [flowPanelName(flowId, pageId)]
    : [flowPanelName(flowId, pageId), flowPanelName(flowId)];

  if (isBase44Backend()) {
    for (const name of names) {
      try {
        const rows = await filterPanelConfig(name);
        if (rows.length && rows[0].config_json) {
          return JSON.parse(rows[0].config_json);
        }
      } catch (err) {
        console.warn(`[studioSession] panel load failed for ${name}`, err);
      }
    }
  }

  const localKeys = pageId
    ? [`${SESSION_STORAGE_KEY}:panel:${flowId}:${pageId}`, `${SESSION_STORAGE_KEY}:panel:${flowId}`]
    : [`${SESSION_STORAGE_KEY}:panel:${flowId}`];

  for (const key of localKeys) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) return JSON.parse(raw);
    } catch {
      /* try next */
    }
  }

  return null;
}

export async function loadAllFlowPanels(session) {
  const panels = {};
  const jobs = [];

  for (const flowId of getAllSiteIds(session)) {
    panels[flowId] = {};
    const site = getActiveFlowSite(session, flowId);
    const pageIds = (site.pages ?? []).map(p => p.id);

    for (const pageId of pageIds) {
      jobs.push(
        loadFlowPanel(flowId, pageId).then(raw => ({ flowId, pageId, raw })),
      );
    }
    jobs.push(
      loadFlowPanel(flowId, GLOBAL_PANEL_PAGE_ID).then(raw => ({
        flowId,
        pageId: GLOBAL_PANEL_PAGE_ID,
        raw,
      })),
    );
  }

  const results = await Promise.all(jobs);
  for (const { flowId, pageId, raw } of results) {
    panels[flowId][pageId] = raw;
  }

  await Promise.all(getAllSiteIds(session).map(async (flowId) => {
    if (!panels[flowId].home) {
      const legacy = await loadFlowPanel(flowId);
      if (legacy) panels[flowId].home = legacy;
    }
  }));

  return panels;
}

export async function saveFlowPanel(flowId, pageId, panelConfig) {
  const slim = preparePanelConfigForSave(panelConfig);
  const name = flowPanelName(flowId, pageId);
  const size = panelConfigByteSize(slim);

  try {
    localStorage.setItem(`${SESSION_STORAGE_KEY}:panel:${flowId}:${pageId}`, JSON.stringify(slim));
  } catch (err) {
    console.warn(`[studioSession] local panel save failed for ${name}`, err);
  }

  if (!isBase44Backend()) return { storage: 'local', size };

  if (size > PANEL_CONFIG_MAX_CHARS) {
    console.warn(`[studioSession] panel ${name} still large (${size} chars)`);
  }

  const payload = {
    name,
    version: slim.version || 'panel-edit-6',
    is_active: false,
    config_json: JSON.stringify(slim),
  };

  try {
    const existing = await filterPanelConfig(name);
    if (existing.length) {
      await updatePanelConfigRow(existing[0].id, payload);
      return { id: existing[0].id, storage: 'base44', size };
    }

    const created = await createPanelConfigRow(payload);
    return { id: created.id, storage: 'base44', size };
  } catch (err) {
    console.warn(`[studioSession] Base44 panel save failed for ${name}`, err);
    return { storage: 'local', size, base44Error: err?.message ?? 'Panel row sync failed' };
  }
}

export async function saveAllFlowPanels(flowId, panelsByPage) {
  const results = [];
  for (const [pageId, panel] of Object.entries(panelsByPage ?? {})) {
    if (panel) results.push(await saveFlowPanel(flowId, pageId, panel));
  }
  return results;
}

export async function loadStudioSession() {
  let remote = null;
  let local = readLocalSession();

  if (isBase44Backend()) {
    try {
      const rows = await filterActiveSiteProject({ name: SITE_PROJECT_NAME });
      if (rows.length && rows[0].project_json) {
        remote = JSON.parse(rows[0].project_json);
      }
    } catch (err) {
      console.warn('[studioSession] Base44 load failed', err);
    }
  }

  const saved = pickNewerSession(remote, local);
  let migrated = migrateToSession(saved);

  if (local?.panelState?.pagePatches && remote && (remote.savedAt ?? 0) >= (local.savedAt ?? 0)) {
    migrated = {
      ...migrated,
      panelState: {
        ...migrated.panelState,
        pagePatches: {
          ...(local.panelState.pagePatches ?? {}),
          ...(migrated.panelState?.pagePatches ?? {}),
        },
        pageVisibility: {
          ...(local.panelState.pageVisibility ?? {}),
          ...(migrated.panelState?.pageVisibility ?? {}),
        },
      },
    };
  }

  if (
    isBase44Backend()
    && local
    && remote
    && (local.savedAt ?? 0) > (remote.savedAt ?? 0)
  ) {
    void saveStudioSession(migrated).catch(err => {
      console.warn('[studioSession] Base44 re-sync failed', err);
    });
  }

  return migrated;
}

export async function saveStudioSession(session) {
  const payload = buildSessionPayload(session, session?.activeFlowId ?? 'thalina');

  try {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(payload));
  } catch (err) {
    console.warn('[studioSession] local save failed', err);
    throw err;
  }

  if (!isBase44Backend()) return { storage: 'local', savedAt: payload.savedAt };

  const row = {
    name: SITE_PROJECT_NAME,
    is_active: true,
    project_json: JSON.stringify({
      ...payload,
      panelState: panelStateForRemoteSync(payload.panelState),
    }),
  };

  try {
    const existing = await filterActiveSiteProject({ name: SITE_PROJECT_NAME });
    if (existing.length) {
      await updateSiteProjectRow(existing[0].id, row);
      return { id: existing[0].id, storage: 'base44', savedAt: payload.savedAt };
    }

    const created = await createSiteProjectRow(row);
    return { id: created.id, storage: 'base44', savedAt: payload.savedAt };
  } catch (err) {
    console.warn('[studioSession] Base44 session save failed', err);
    return {
      storage: 'local',
      savedAt: payload.savedAt,
      base44Error: err?.message ?? 'Base44 sync failed',
    };
  }
}

export function getActiveFlowSite(session, flowId = session?.activeFlowId) {
  const meta = resolveSiteMeta(session, flowId);
  const raw = session?.flows?.[flowId]?.site ?? defaultSiteForSiteMeta(meta);
  return migrateSiteToPageData(raw, flowId);
}

export function patchFlowSite(session, flowId, sitePatch) {
  const current = getActiveFlowSite(session, flowId);
  const merged = { ...current, ...sitePatch };

  if (sitePatch.sections !== undefined || sitePatch.elements !== undefined) {
    const pageId = merged.currentPage ?? 'home';
    const withPage = mergePageCanvas(merged, pageId, {
      sections: sitePatch.sections ?? getPageCanvas(merged, pageId).sections,
      elements: sitePatch.elements ?? getPageCanvas(merged, pageId).elements,
    });
    return {
      ...session,
      flows: {
        ...session.flows,
        [flowId]: { ...session.flows?.[flowId], site: withPage },
      },
    };
  }

  return {
    ...session,
    flows: {
      ...session.flows,
      [flowId]: { ...session.flows?.[flowId], site: merged },
    },
  };
}

export function patchFlowPageCanvas(session, flowId, pageId, canvas) {
  const site = getActiveFlowSite(session, flowId);
  const withPage = mergePageCanvas(site, pageId, canvas);
  return {
    ...session,
    flows: {
      ...session.flows,
      [flowId]: { ...session.flows?.[flowId], site: withPage },
    },
  };
}
