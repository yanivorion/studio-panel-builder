import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { TopBar } from './ui/TopBar.jsx';
import { LeftSidebar } from './ui/LeftSidebar.jsx';
import { AddPanel } from './ui/AddPanel.jsx';
import { SiteStructure } from './ui/SiteStructure.jsx';
import { Canvas } from './ui/Canvas.jsx';
import { Inspector } from './ui/Inspector.jsx';
import { LayoutBuilderEditor } from './layoutBuilder/LayoutBuilderEditor.jsx';
import { loadInitialTemplates } from './layoutBuilder/builder/mockData';
import { tokens } from './ui/tokens.js';
import { loadPanelConfig } from './services/panelConfigService.js';
import { preparePanelConfigForSave, panelConfigByteSize } from './services/panelConfigSerialize.js';
import { ensureUploadedTemplates } from './services/panelTemplateUpload.js';
import { isBase44Backend } from './services/backend.js';
import { resolvePanelConfigState } from './services/panelConfigResolve.js';
import { DEFAULT_CATEGORIES } from './ui/addPanelData.js';
import { buildDefaultGroups } from './panelConfig/panelStructure.js';

const DEFAULT_PANEL_GROUPS = buildDefaultGroups(DEFAULT_CATEGORIES);
import {
  SESSION_VERSION,
  loadStudioSession,
  saveStudioSession,
  loadAllFlowPanels,
  migratePanelState,
  saveFlowPanel,
  getActiveFlowSite,
  patchFlowSite,
  patchFlowPageCanvas,
  createDefaultSession,
  buildSessionPayload,
} from './services/studioSessionService.js';
import {
  createDefaultPanelState,
  patchPanelState,
  resolveEffectivePanelSnapshot,
  resolvePanelForEditScope,
  applyPanelSaveForScope,
  getPageVisibility,
  setPageVisibility,
  setPagePatch,
  PANEL_EDIT_SCOPES,
  GLOBAL_PANEL_PAGE_ID,
} from './services/panelRouting.js';
import { buildStudioJsonExport, downloadStudioJson } from './services/studioJsonExport.js';
import { readStudioImportFile, importSummary } from './services/studioJsonImport.js';
import { siteViewForPage } from './services/sitePageData.js';
import { preloadSectionImages } from './ui/sectionImageLoader.js';
import { usePanelConfig } from './hooks/usePanelConfig.js';
import { DEFAULT_SECTIONS, THALINA_SECTIONS } from './data/defaultSections.js';
import {
  getAllSites,
  addSiteToSession,
  findSiteLabel,
} from './services/siteRegistry.js';
import { scopeFromTab } from './layoutBuilder/components/VariantTabBar.jsx';

// ── Initial state ─────────────────────────────────────────────────────────────

const INITIAL_PAGES = [
  { id: 'home', name: 'Home', isHome: true, group: 'main' },
  { id: 'about', name: 'About', group: 'main' },
  { id: 'contact', name: 'Contact', group: 'main' },
];

/** Thalina — Header, Hero, General (static images, 100% width) */
const INITIAL_SECTIONS = DEFAULT_SECTIONS;
const INITIAL_ELEMENTS = [];

// ── Unique ID generator ───────────────────────────────────────────────────────
let uidCounter = 0;
const uid = (prefix = 'el') => `${prefix}-${Date.now()}-${++uidCounter}`;

// ── Default sizes for element types ──────────────────────────────────────────
const ELEMENT_DEFAULTS = {
  heading:    { w: 400, h: 60, props: { text: 'Heading', fontSize: 36, fontWeight: 700, color: '#111827' } },
  paragraph:  { w: 360, h: 80, props: { text: 'Paragraph text goes here.', fontSize: 16, color: '#374151' } },
  text:       { w: 300, h: 60, props: { text: 'Text', fontSize: 16, color: '#374151' } },
  richtext:   { w: 400, h: 100, props: { text: 'Rich text content.', fontSize: 16, color: '#374151' } },
  image:      { w: 320, h: 240, props: { src: '' } },
  'btn-fill': { w: 140, h: 44, props: { label: 'Button', bgColor: '#116DFF', color: '#fff', radius: 6 } },
  'btn-outline': { w: 140, h: 44, props: { label: 'Button', color: '#111827', borderColor: '#111827', radius: 6 } },
  'btn-text': { w: 100, h: 36, props: { label: 'Learn More', color: '#116DFF' } },
  button:     { w: 140, h: 44, props: { label: 'Button', bgColor: '#116DFF', color: '#fff', radius: 6 } },
  'shape-rect':     { w: 200, h: 120, props: { fill: '#e5e7eb' } },
  'shape-circle':   { w: 120, h: 120, props: { fill: '#e5e7eb' } },
  'shape-line':     { w: 300, h: 4, props: { fill: '#d1d5db', thickness: 2 } },
  'shape-triangle': { w: 120, h: 100, props: { fill: '#e5e7eb' } },
  container:  { w: 300, h: 200, props: { bgColor: 'transparent' } },
  stack:      { w: 300, h: 200, props: { bgColor: 'transparent' } },
  'video-embed': { w: 480, h: 270, props: {} },
};

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  // Editor mode
  const [mode, setMode] = useState('Design');
  const [viewport, setViewport] = useState('desktop');
  const [zoom, setZoom] = useState(100);

  // Pages
  const [pages, setPages] = useState(INITIAL_PAGES);
  const [currentPage, setCurrentPage] = useState('home');

  // Canvas data
  const [sections, setSections] = useState(INITIAL_SECTIONS);
  const [elements, setElements] = useState(INITIAL_ELEMENTS);

  // Selection
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [selectedSectionId, setSelectedSectionId] = useState(null);

  // Flow session (site canvas + panel routing)
  const [activeFlowId, setActiveFlowId] = useState('thalina');
  const [panelState, setPanelState] = useState(null);
  const [siteCatalog, setSiteCatalog] = useState(() => getAllSites(createDefaultSession()));
  const sessionRef = useRef(createDefaultSession());
  const [projectReady, setProjectReady] = useState(false);

  // Panels
  const [activePanel, setPanelStateUi] = useState(null);   // 'add' | 'structure' | 'apps' | null
  const [panelEditMode, setPanelEditMode] = useState(false);
  const [panelEditSnapshot, setPanelEditSnapshot] = useState(null);
  const [panelEditScope, setPanelEditScope] = useState(PANEL_EDIT_SCOPES.PAGE);

  const activePagePanel = useMemo(() => {
    if (!projectReady || !panelState) return undefined;
    return resolveEffectivePanelSnapshot({
      globalPanel: panelState.globalPanel,
      pagePatches: panelState.pagePatches,
      pageVisibility: panelState.pageVisibility,
      flowId: activeFlowId,
      pageId: currentPage,
    });
  }, [projectReady, panelState, activeFlowId, currentPage]);

  const panelConfig = usePanelConfig(activePagePanel);

  const pageVisibility = useMemo(() => {
    if (!panelState) return { hiddenGroups: [], hiddenCategories: [] };
    return getPageVisibility(panelState, activeFlowId, currentPage);
  }, [panelState, activeFlowId, currentPage]);
  const [structureTab, setStructureTab] = useState('Pages');
  const [activeTool, setActiveTool] = useState('select');
  const [saveStatus, setSaveStatus] = useState('');

  // History for undo/redo
  const history = useRef([{ sections: INITIAL_SECTIONS, elements: INITIAL_ELEMENTS }]);
  const historyIdx = useRef(0);
  const saveTimerRef = useRef(null);

  const applySiteState = useCallback((site, pageId) => {
    const view = siteViewForPage(site, pageId ?? site?.currentPage);
    setPages(view.pages ?? INITIAL_PAGES);
    setCurrentPage(view.currentPage ?? 'home');
    setSections(view.sections ?? []);
    setElements(view.elements ?? []);
    history.current = [{ sections: view.sections ?? [], elements: view.elements ?? [] }];
    historyIdx.current = 0;
  }, []);

  const flushPageCanvas = useCallback((pageId, canvas = null) => {
    const targetPage = pageId ?? currentPage;
    const latest = canvas ?? history.current[historyIdx.current] ?? { sections, elements };
    sessionRef.current = patchFlowPageCanvas(sessionRef.current, activeFlowId, targetPage, latest);
    sessionRef.current = patchFlowSite(sessionRef.current, activeFlowId, {
      pages,
      currentPage: targetPage,
    });
  }, [activeFlowId, currentPage, pages, sections, elements]);

  const flushActivePageCanvas = useCallback(() => {
    flushPageCanvas(currentPage);
  }, [currentPage, flushPageCanvas]);

  useEffect(() => {
    void loadInitialTemplates().catch(err => {
      console.warn('[App] template preload failed', err);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    const panelNeedsMigrate = (raw) => {
      if (!raw) return true;
      if (raw.version !== 'panel-edit-6') return true;
      const ids = new Set((raw.categories ?? []).map(c => c.id));
      return !ids.has('stores') || !ids.has('events') || !ids.has('bookings');
    };

    const hydrateFlowPanel = async (raw) => {
      const resolved = await resolvePanelConfigState(raw);
      return preparePanelConfigForSave({
        version: 'panel-edit-6',
        layoutName: resolved.layoutName,
        categories: resolved.categories,
        groups: resolved.groups,
        templates: resolved.templates,
        groupLayouts: resolved.groupLayouts,
      });
    };

    const applySessionToApp = async (session, flowId) => {
      sessionRef.current = { ...session, version: SESSION_VERSION };
      const site = getActiveFlowSite(sessionRef.current, flowId);
      const view = siteViewForPage(site, site.currentPage);
      await preloadSectionImages(view.sections ?? []);
      if (cancelled) return;
      setActiveFlowId(flowId);
      setPanelState(sessionRef.current.panelState ?? createDefaultPanelState());
      setSiteCatalog(getAllSites(sessionRef.current));
      applySiteState(site, site.currentPage);
    };

    (async () => {
      try {
        const session = await loadStudioSession();
        if (cancelled) return;

        const legacyPanels = await loadAllFlowPanels(session);
        if (cancelled) return;

        let migratedSession = migratePanelState(session, legacyPanels);
        const flowId = migratedSession.activeFlowId ?? 'thalina';

        if (!legacyPanels.thalina?.home) {
          const legacy = await loadPanelConfig();
          if (legacy?.categories?.length) {
            const slim = await hydrateFlowPanel(legacy);
            migratedSession = migratePanelState(migratedSession, {
              thalina: { home: slim },
            });
          }
        }

        const nextPatches = { ...(migratedSession.panelState?.pagePatches ?? {}) };
        let patchesChanged = false;

        for (const [key, raw] of Object.entries(nextPatches)) {
          if (!raw || panelNeedsMigrate(raw)) {
            nextPatches[key] = await hydrateFlowPanel(raw);
            patchesChanged = true;
          }
        }

        if (patchesChanged) {
          migratedSession = patchPanelState(migratedSession, {
            ...migratedSession.panelState,
            pagePatches: nextPatches,
          });
        }

        sessionRef.current = migratedSession;
        await applySessionToApp(migratedSession, flowId);
        if (cancelled) return;
        setProjectReady(true);

        if (session.version !== SESSION_VERSION || patchesChanged) {
          await saveStudioSession(sessionRef.current);
        }
      } catch (err) {
        console.error('[App] session init failed', err);
        if (!cancelled) {
          const session = createDefaultSession();
          await applySessionToApp(session, 'thalina');
          if (!cancelled) setProjectReady(true);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [applySiteState]);

  useEffect(() => {
    if (!projectReady) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        flushActivePageCanvas();
        sessionRef.current = buildSessionPayload(sessionRef.current, activeFlowId);
        await saveStudioSession(sessionRef.current);
        setSaveStatus('Session saved');
        setTimeout(() => setSaveStatus(''), 2000);
      } catch (err) {
        console.error('[App] autosave failed', err);
        setSaveStatus('Save failed — use Save session');
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }, 2000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [pages, sections, elements, activeFlowId, projectReady, flushActivePageCanvas]);

  const pushHistory = useCallback((newSections, newElements) => {
    const snapshot = { sections: newSections, elements: newElements };
    history.current = history.current.slice(0, historyIdx.current + 1);
    history.current.push(snapshot);
    historyIdx.current = history.current.length - 1;
  }, []);

  const handleUndo = useCallback(() => {
    if (historyIdx.current <= 0) return;
    historyIdx.current--;
    const snap = history.current[historyIdx.current];
    setSections(snap.sections);
    setElements(snap.elements);
    setSelectedElementId(null);
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIdx.current >= history.current.length - 1) return;
    historyIdx.current++;
    const snap = history.current[historyIdx.current];
    setSections(snap.sections);
    setElements(snap.elements);
  }, []);

  // ── Panel toggle ────────────────────────────────────────────────────────────
  const persistPanelState = useCallback(async (nextPanelState, statusMessage) => {
    setPanelState(nextPanelState);
    sessionRef.current = patchPanelState(sessionRef.current, nextPanelState);
    sessionRef.current = buildSessionPayload(sessionRef.current, activeFlowId);
    const result = await saveStudioSession(sessionRef.current);

    let msg = statusMessage;
    if (result.base44Error) {
      msg = statusMessage
        ? `${statusMessage} (saved locally — Base44 sync failed)`
        : 'Saved locally — Base44 sync failed';
    } else if (statusMessage && result.storage === 'local') {
      msg = `${statusMessage} (local)`;
    }

    if (msg) {
      setSaveStatus(msg);
      setTimeout(() => setSaveStatus(''), 4000);
    }
    return result;
  }, [activeFlowId]);

  const openPanelEditMode = useCallback(() => {
    const scope = PANEL_EDIT_SCOPES.PAGE;
    const snapshot = resolvePanelForEditScope(sessionRef.current.panelState ?? createDefaultPanelState(), {
      flowId: activeFlowId,
      pageId: currentPage,
      scope,
    });
    setPanelEditScope(scope);
    setPanelEditSnapshot(snapshot);
    setPanelEditMode(true);
    setPanelStateUi(null);
    setSelectedElementId(null);
    setSelectedSectionId(null);
  }, [activeFlowId, currentPage]);

  const handlePanelEditScopeChange = useCallback((scope) => {
    const snapshot = resolvePanelForEditScope(sessionRef.current.panelState ?? createDefaultPanelState(), {
      flowId: activeFlowId,
      pageId: currentPage,
      scope,
    });
    setPanelEditScope(scope);
    setPanelEditSnapshot(snapshot);
  }, [activeFlowId, currentPage]);

  const handleVariantTabChange = useCallback(async (tab) => {
    const tabScope = scopeFromTab(tab);
    const scope = tabScope === 'global' ? PANEL_EDIT_SCOPES.GLOBAL : PANEL_EDIT_SCOPES.PAGE;
    setPanelEditScope(scope);
    const snapshot = resolvePanelForEditScope(sessionRef.current.panelState ?? createDefaultPanelState(), {
      flowId: activeFlowId,
      pageId: currentPage,
      scope,
    });
    setPanelEditSnapshot(snapshot);
  }, [activeFlowId, currentPage]);

  const handlePageVisibilityChange = useCallback(async (visibility) => {
    const base = sessionRef.current.panelState ?? createDefaultPanelState();
    const nextPanelState = {
      ...base,
      pageVisibility: setPageVisibility(base.pageVisibility ?? {}, activeFlowId, currentPage, visibility),
    };
    sessionRef.current = { ...sessionRef.current, panelState: nextPanelState };
    try {
      await persistPanelState(nextPanelState);
    } catch (err) {
      console.warn('[App] page visibility save failed', err);
    }
  }, [activeFlowId, currentPage, persistPanelState]);

  const closeFloatingPanels = useCallback(() => {
    setPanelStateUi(null);
  }, []);

  const toggleAddPanel = useCallback(() => {
    setPanelStateUi(prev => (prev === 'add' ? null : 'add'));
    setPanelEditMode(false);
    setPanelEditSnapshot(null);
  }, []);

  const handlePanelToggle = useCallback((panel) => {
    if (panel === 'design') {
      if (panelEditMode) {
        setPanelEditMode(false);
        setPanelEditSnapshot(null);
      } else {
        openPanelEditMode();
      }
      return;
    }
    if (panel === 'add') {
      toggleAddPanel();
      return;
    }
    setPanelEditMode(false);
    setPanelEditSnapshot(null);
    if (panel === null) {
      setPanelStateUi(null);
      return;
    }
    setPanelStateUi(prev => (prev === panel ? null : panel));
  }, [panelEditMode, openPanelEditMode, toggleAddPanel]);

  // ── Element operations ──────────────────────────────────────────────────────
  const handleDropElement = useCallback((sectionId, elementData, x, y) => {
    const defaults = ELEMENT_DEFAULTS[elementData.id] || { w: 200, h: 100, props: {} };
    const newEl = {
      id: uid(),
      type: elementData.id,
      sectionId,
      x: Math.round(x),
      y: Math.round(y),
      w: defaults.w,
      h: defaults.h,
      props: { ...defaults.props },
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedElementId(newEl.id);
    pushHistory(sections, newElements);
  }, [elements, sections, pushHistory]);

  const handleAddElement = useCallback((elementData) => {
    const targetSection = sections[0];
    if (!targetSection) return;
    const defaults = ELEMENT_DEFAULTS[elementData.id] || { w: 200, h: 100, props: {} };
    const newEl = {
      id: uid(),
      type: elementData.id,
      sectionId: targetSection.id,
      x: 60,
      y: 60,
      w: defaults.w,
      h: defaults.h,
      props: { ...defaults.props },
    };
    const newElements = [...elements, newEl];
    setElements(newElements);
    setSelectedElementId(newEl.id);
    pushHistory(sections, newElements);
  }, [elements, sections, pushHistory]);

  const handleDeleteElement = useCallback((id) => {
    const newElements = elements.filter(e => e.id !== id);
    setElements(newElements);
    setSelectedElementId(prev => prev === id ? null : prev);
    pushHistory(sections, newElements);
  }, [elements, sections, pushHistory]);

  const handleDuplicateElement = useCallback((id) => {
    const el = elements.find(e => e.id === id);
    if (!el) return;
    const copy = { ...el, id: uid(), x: el.x + 20, y: el.y + 20, props: { ...el.props } };
    const newElements = [...elements, copy];
    setElements(newElements);
    setSelectedElementId(copy.id);
    pushHistory(sections, newElements);
  }, [elements, sections, pushHistory]);

  const handleMoveElement = useCallback((id, x, y) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, x: Math.round(x), y: Math.round(y) } : e));
  }, []);

  const handleMoveElementEnd = useCallback(() => {
    pushHistory(sections, elements);
  }, [sections, elements, pushHistory]);

  const handleResizeElement = useCallback((id, x, y, w, h) => {
    setElements(prev => prev.map(e => e.id === id ? { ...e, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) } : e));
  }, []);

  const handleUpdateElement = useCallback((id, patch) => {
    const newElements = elements.map(e => {
      if (e.id !== id) return e;
      const merged = { ...e, ...patch };
      if (patch.props) merged.props = { ...e.props, ...patch.props };
      return merged;
    });
    setElements(newElements);
    pushHistory(sections, newElements);
  }, [elements, sections, pushHistory]);

  // ── Section operations ──────────────────────────────────────────────────────
  const handleAddSection = useCallback((insertAtOrPreset) => {
    const insertIndex = typeof insertAtOrPreset === 'number'
      ? insertAtOrPreset
      : sections.length;

    const newSection = {
      id: uid('sec'),
      label: `Section ${sections.length + 1}`,
      height: 400,
      bg: '#fff',
    };
    const newSections = [
      ...sections.slice(0, insertIndex),
      newSection,
      ...sections.slice(insertIndex),
    ];
    setSections(newSections);
    setSelectedSectionId(newSection.id);
    setSelectedElementId(null);
    pushHistory(newSections, elements);
  }, [sections, elements, pushHistory]);

  const handleApplyHeroTemplate = useCallback((presetId) => {
    if (presetId !== 'thalina') return;

    const newSections = THALINA_SECTIONS;
    const newElements = [];

    setSections(newSections);
    setElements(newElements);
    setSelectedSectionId('sec-header');
    setSelectedElementId(null);
    pushHistory(newSections, newElements);
  }, [pushHistory]);

  const handleUpdateSection = useCallback((id, patch) => {
    const newSections = sections.map(s => (s.id === id ? { ...s, ...patch } : s));
    setSections(newSections);
    pushHistory(newSections, elements);
  }, [sections, elements, pushHistory]);

  const handleSwapSectionImage = useCallback((sectionId, otherSectionId) => {
    const a = sections.find(s => s.id === sectionId);
    const b = sections.find(s => s.id === otherSectionId);
    if (!a || !b) return;

    const imgA = a.image || a.backgroundImage || null;
    const imgB = b.image || b.backgroundImage || null;

    const newSections = sections.map(s => {
      if (s.id === sectionId) {
        return { ...s, image: imgB, backgroundImage: null, backgroundSize: null, backgroundPosition: null };
      }
      if (s.id === otherSectionId) {
        return { ...s, image: imgA, backgroundImage: null, backgroundSize: null, backgroundPosition: null };
      }
      return s;
    });

    setSections(newSections);
    pushHistory(newSections, elements);
  }, [sections, elements, pushHistory]);

  // ── Selection ───────────────────────────────────────────────────────────────
  const handleSelectElement = useCallback((id) => {
    setSelectedElementId(id);
    setSelectedSectionId(null);
  }, []);

  const handleSelectSection = useCallback((id) => {
    setSelectedSectionId(id);
    setSelectedElementId(null);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedElementId(null);
    setSelectedSectionId(null);
  }, []);

  const handlePageNavigate = useCallback(async (pageId) => {
    if (pageId === currentPage) return;

    // Save the page we're leaving (explicit id — avoids racing with setCurrentPage)
    flushPageCanvas(currentPage);

    sessionRef.current = patchFlowSite(sessionRef.current, activeFlowId, {
      currentPage: pageId,
    });

    const site = getActiveFlowSite(sessionRef.current, activeFlowId);
    const view = siteViewForPage(site, pageId);

    await preloadSectionImages(view.sections ?? []);

    setPages(view.pages ?? pages);
    setCurrentPage(pageId);
    setSections(view.sections ?? []);
    setElements(view.elements ?? []);
    history.current = [{ sections: view.sections ?? [], elements: view.elements ?? [] }];
    historyIdx.current = 0;

    setSelectedElementId(null);
    setSelectedSectionId(null);

    try {
      sessionRef.current = buildSessionPayload(sessionRef.current, activeFlowId);
      await saveStudioSession(sessionRef.current);
    } catch (err) {
      console.warn('[App] page navigate save failed', err);
    }

    setSaveStatus(`Page: ${pages.find(p => p.id === pageId)?.name ?? pageId}`);
    setTimeout(() => setSaveStatus(''), 2000);
  }, [activeFlowId, currentPage, flushPageCanvas, pages, sections, elements]);

  const handleAddSite = useCallback(async () => {
    const label = window.prompt('New site name', 'My Site');
    if (!label?.trim()) return;

    try {
      flushActivePageCanvas();
      const { session: nextSession, siteId } = addSiteToSession(sessionRef.current, {
        label: label.trim(),
      });

      sessionRef.current = buildSessionPayload(nextSession, siteId);
      await saveStudioSession(sessionRef.current);

      setPanelState(sessionRef.current.panelState ?? createDefaultPanelState());
      setSiteCatalog(getAllSites(sessionRef.current));
      setActiveFlowId(siteId);

      const site = getActiveFlowSite(sessionRef.current, siteId);
      const view = siteViewForPage(site, site.currentPage);
      await preloadSectionImages(view.sections ?? []);
      applySiteState(site, site.currentPage);

      setPanelStateUi(null);
      setSelectedElementId(null);
      setSelectedSectionId(null);
      setSaveStatus(`Added site · ${label.trim()}`);
      setTimeout(() => setSaveStatus(''), 2500);
    } catch (err) {
      console.error('[App] add site failed', err);
      setSaveStatus(`Could not add site — ${err?.message ?? 'unknown error'}`);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  }, [flushActivePageCanvas, applySiteState]);

  const handleFlowChange = useCallback(async (flowId) => {
    if (flowId === activeFlowId) return;

    flushActivePageCanvas();
    sessionRef.current = buildSessionPayload(sessionRef.current, activeFlowId);
    await saveStudioSession(sessionRef.current);

    sessionRef.current = { ...sessionRef.current, activeFlowId: flowId };
    const site = getActiveFlowSite(sessionRef.current, flowId);
    const view = siteViewForPage(site, site.currentPage);
    await preloadSectionImages(view.sections ?? []);
    setActiveFlowId(flowId);
    applySiteState(site, site.currentPage);
    setSelectedElementId(null);
    setSelectedSectionId(null);
    setPanelStateUi(null);
    setSaveStatus(`Switched to ${findSiteLabel(sessionRef.current, flowId)}`);
    setTimeout(() => setSaveStatus(''), 2000);
  }, [activeFlowId, flushActivePageCanvas, applySiteState]);

  const handleFlowPanelSave = useCallback(async (panelPayload) => {
    const uploadedTemplates = await ensureUploadedTemplates(panelPayload.templates ?? []);
    const payload = { ...panelPayload, templates: uploadedTemplates };
    const slim = preparePanelConfigForSave(payload);
    const pageName = pages.find(p => p.id === currentPage)?.name ?? currentPage;
    const flowLabel = findSiteLabel(sessionRef.current, activeFlowId);
    const scopeLabel = panelEditScope === PANEL_EDIT_SCOPES.GLOBAL
      ? 'global (all pages)'
      : `${flowLabel} / ${pageName}`;

    const nextPanelStateObj = applyPanelSaveForScope(
      sessionRef.current.panelState ?? createDefaultPanelState(),
      {
        flowId: activeFlowId,
        pageId: currentPage,
        scope: panelEditScope,
        slim,
      },
    );

    const panelPageId = panelEditScope === PANEL_EDIT_SCOPES.GLOBAL
      ? GLOBAL_PANEL_PAGE_ID
      : currentPage;
    const rowResult = await saveFlowPanel(activeFlowId, panelPageId, slim);

    const result = await persistPanelState(nextPanelStateObj, `Panel saved · ${scopeLabel}`);

    const size = panelConfigByteSize(slim);
    if (rowResult?.storage === 'base44') {
      setSaveStatus(`Panel saved to cloud · ${scopeLabel} (${size} bytes)`);
      setTimeout(() => setSaveStatus(''), 4000);
    } else if (rowResult?.base44Error || result.base44Error) {
      setSaveStatus(`Panel saved locally (${size} bytes) — cloud sync failed`);
      setTimeout(() => setSaveStatus(''), 5000);
    }
    return { ...result, rowResult };
  }, [activeFlowId, currentPage, pages, panelEditScope, persistPanelState]);

  const handleImportJson = useCallback(async (file) => {
    try {
      const parsed = await readStudioImportFile(file);

      if (parsed.panelConfigOnly) {
        const pageName = pages.find(p => p.id === currentPage)?.name ?? currentPage;
        const flowLabel = findSiteLabel(sessionRef.current, activeFlowId);
        const importScope = panelEditMode && panelEditScope === PANEL_EDIT_SCOPES.GLOBAL
          ? PANEL_EDIT_SCOPES.GLOBAL
          : PANEL_EDIT_SCOPES.PAGE;
        const scopeLabel = importScope === PANEL_EDIT_SCOPES.GLOBAL
          ? 'global panel (all pages)'
          : `${flowLabel} / ${pageName}`;

        const ok = window.confirm(
          `Import panel layout into ${scopeLabel}?\n\n`
          + 'This replaces the current panel layout for that scope.',
        );
        if (!ok) return;

        const slim = preparePanelConfigForSave(parsed.panelConfigOnly);
        const nextPanelState = applyPanelSaveForScope(
          sessionRef.current.panelState ?? createDefaultPanelState(),
          {
            flowId: activeFlowId,
            pageId: currentPage,
            scope: importScope,
            slim,
          },
        );

        await persistPanelState(nextPanelState, `Panel imported · ${scopeLabel}`);

        if (panelEditMode) {
          const snapshot = resolvePanelForEditScope(nextPanelState, {
            flowId: activeFlowId,
            pageId: currentPage,
            scope: importScope,
          });
          setPanelEditSnapshot(snapshot);
        }
        return;
      }

      const summary = importSummary(parsed);

      const ok = window.confirm(
        `Import studio snapshot?\n\n`
        + `Sites: ${summary.flowCount}\n`
        + `Page panel layouts: ${summary.patchCount}\n\n`
        + `This replaces your current session.`,
      );
      if (!ok) return;

      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      flushActivePageCanvas();

      sessionRef.current = parsed.session;
      sessionRef.current = patchPanelState(sessionRef.current, parsed.panelState);
      sessionRef.current = buildSessionPayload(sessionRef.current, parsed.activeFlowId);

      await saveStudioSession(sessionRef.current);

      const flowId = parsed.activeFlowId ?? 'thalina';
      setPanelState(parsed.panelState);
      setSiteCatalog(getAllSites(sessionRef.current));
      setActiveFlowId(flowId);
      setPanelEditMode(false);
      setPanelEditSnapshot(null);

      const site = getActiveFlowSite(sessionRef.current, flowId);
      await preloadSectionImages(siteViewForPage(site, site.currentPage).sections ?? []);
      applySiteState(site, site.currentPage);

      setSaveStatus(`Imported · ${file.name}`);
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (err) {
      console.error('[App] import failed', err);
      setSaveStatus(`Import failed — ${err?.message ?? 'invalid file'}`);
      setTimeout(() => setSaveStatus(''), 4000);
    }
  }, [
    activeFlowId,
    currentPage,
    pages,
    panelEditMode,
    panelEditScope,
    persistPanelState,
    flushActivePageCanvas,
    applySiteState,
  ]);

  const handleSaveSession = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    try {
      flushActivePageCanvas();
      sessionRef.current = buildSessionPayload(sessionRef.current, activeFlowId);
      const result = await saveStudioSession(sessionRef.current);
      const flowLabel = findSiteLabel(sessionRef.current, activeFlowId);
      if (result.base44Error) {
        setSaveStatus(`Session saved locally · ${flowLabel} (Base44 sync failed)`);
      } else {
        setSaveStatus(
          result.storage === 'base44'
            ? `Session saved · ${flowLabel}`
            : `Session saved · ${flowLabel} (local)`,
        );
      }
    } catch (err) {
      console.error('[App] save session failed', err);
      setSaveStatus(`Save failed — ${err?.message ?? 'check storage'}`);
    }
    setTimeout(() => setSaveStatus(''), 3000);
  }, [activeFlowId, flushActivePageCanvas]);

  const handleSaveJson = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    flushActivePageCanvas();
    const session = buildSessionPayload(sessionRef.current, activeFlowId);

    let exportPanelState = sessionRef.current.panelState ?? createDefaultPanelState();
    if (panelEditMode && panelEditSnapshot) {
      exportPanelState = {
        ...exportPanelState,
        pagePatches: setPagePatch(
          exportPanelState.pagePatches ?? {},
          activeFlowId,
          currentPage,
          panelEditSnapshot,
        ),
      };
    }

    const exportData = buildStudioJsonExport(session, exportPanelState, activeFlowId);
    const { filename, bytes } = downloadStudioJson(exportData);
    setSaveStatus(`JSON saved · ${filename} (${Math.round(bytes / 1024)} KB)`);
    setTimeout(() => setSaveStatus(''), 3000);
  }, [
    activeFlowId,
    currentPage,
    flushActivePageCanvas,
    panelEditMode,
    panelEditSnapshot,
  ]);

  // ── Computed ─────────────────────────────────────────────────────────────────
  const selectedElement = elements.find(e => e.id === selectedElementId) || null;
  const selectedSection = sections.find(s => s.id === selectedSectionId) || null;
  const canUndo = historyIdx.current > 0;
  const canRedo = historyIdx.current < history.current.length - 1;

  const showAddPanel = activePanel === 'add' && !panelEditMode;
  const showStructure = activePanel === 'structure' && !panelEditMode;

  const floatingPanelShell = {
    position: 'fixed',
    left: tokens.leftRailW,
    top: tokens.topBarH,
    bottom: 0,
    zIndex: 5000,
    display: 'flex',
    boxShadow: '4px 0 32px rgba(0,0,0,0.45)',
  };

  return (
    <>
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: tokens.bg0,
      fontFamily: tokens.fontUI,
    }}>
      {/* Top bar */}
      <TopBar
        mode={mode}
        onModeChange={setMode}
        siteName="My Studio"
        flows={siteCatalog}
        activeFlowId={activeFlowId}
        onFlowChange={handleFlowChange}
        onAddSite={handleAddSite}
        saveStatus={saveStatus}
        onSaveSession={handleSaveSession}
        onSaveJson={handleSaveJson}
        onImportJson={handleImportJson}
        currentPage={pages.find(p => p.id === currentPage)?.name || 'Home'}
        pages={pages.map(p => p.name)}
        onPageChange={name => {
          const p = pages.find(pg => pg.name === name);
          if (p) handlePageNavigate(p.id);
        }}
        viewport={viewport}
        onViewportChange={setViewport}
        zoom={zoom}
        onZoom={setZoom}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onPreview={() => {}}
      />

      {/* Body: sidebar + canvas OR layout builder edit mode */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
        <LeftSidebar
          activeTool={activeTool}
          activePanel={panelEditMode ? 'design' : activePanel}
          onToolChange={setActiveTool}
          onPanelToggle={handlePanelToggle}
          onAddPanelToggle={toggleAddPanel}
        />

        {panelEditMode ? (
          <LayoutBuilderEditor
            key={`panel-edit-${activeFlowId}-${currentPage}`}
            initialPanel={panelEditSnapshot}
            pageLabel={`${findSiteLabel(sessionRef.current, activeFlowId)} · ${pages.find(p => p.id === currentPage)?.name ?? currentPage}`}
            editScope={panelEditScope}
            onEditScopeChange={handlePanelEditScopeChange}
            onVariantTabChange={handleVariantTabChange}
            pageVisibility={pageVisibility}
            onPageVisibilityChange={handlePageVisibilityChange}
            onPanelSave={handleFlowPanelSave}
            onClose={() => {
              setPanelEditMode(false);
              setPanelEditSnapshot(null);
              setPanelEditScope(PANEL_EDIT_SCOPES.PAGE);
              panelConfig.reload(activePagePanel);
            }}
          />
        ) : (
        <>
        {projectReady ? (
        <Canvas
          viewport={viewport}
          zoom={zoom}
          sections={sections}
          elements={elements}
          selectedElementId={selectedElementId}
          selectedSectionId={selectedSectionId}
          onSelectElement={handleSelectElement}
          onSelectSection={handleSelectSection}
          onDeselect={handleDeselect}
          onDropElement={handleDropElement}
          onAddSection={handleAddSection}
          onDeleteElement={handleDeleteElement}
          onDuplicateElement={handleDuplicateElement}
          onMoveElement={handleMoveElement}
          onResizeElement={handleResizeElement}
        />
        ) : (
          <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: tokens.canvasBg,
            color: tokens.text3,
            fontFamily: tokens.fontUI,
            fontSize: 13,
          }}>
            Loading project…
          </div>
        )}

        <Inspector
          element={selectedElement}
          section={selectedSection}
          sections={sections}
          selectedSectionId={selectedSectionId}
          onSelectSection={handleSelectSection}
          onUpdate={handleUpdateElement}
          onUpdateSection={handleUpdateSection}
          onSwapSectionImage={handleSwapSectionImage}
          onDeselect={handleDeselect}
        />
        </>
        )}
      </div>
    </div>

    {showAddPanel && createPortal(
      <div style={floatingPanelShell}>
        <AddPanel
          categories={panelConfig.categories?.length ? panelConfig.categories : DEFAULT_CATEGORIES}
          groups={panelConfig.groups?.length ? panelConfig.groups : DEFAULT_PANEL_GROUPS}
          groupLayouts={panelConfig.groupLayouts}
          panelTemplates={panelConfig.templates}
          getLayoutSlot={panelConfig.getLayoutSlot}
          onAddElement={handleAddElement}
          onAddSection={handleAddSection}
          onApplyHeroTemplate={handleApplyHeroTemplate}
          onClose={closeFloatingPanels}
          onEditPanel={openPanelEditMode}
        />
      </div>,
      document.body,
    )}

    {showStructure && createPortal(
      <div style={floatingPanelShell}>
        <SiteStructure
          activeTab={structureTab}
          onTabChange={setStructureTab}
          pages={pages}
          sections={sections}
          elements={elements}
          currentPage={currentPage}
          onNavigatePage={handlePageNavigate}
          selectedElementId={selectedElementId}
          selectedSectionId={selectedSectionId}
          onSelectElement={handleSelectElement}
          onSelectSection={handleSelectSection}
          onClose={closeFloatingPanels}
        />
      </div>,
      document.body,
    )}
    </>
  );
}
