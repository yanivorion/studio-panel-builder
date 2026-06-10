import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { AddPanel } from '../ui/AddPanel.jsx';
import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';
import { tokens } from '../ui/tokens.js';
import { LeftPanel } from './components/LeftPanel';
import {
  applyPreset,
  normalizeLayoutItems,
  withEffectiveGridConfig,
  seedCollageRows,
} from './builder/gridEngine';
import { loadInitialTemplates } from './builder/mockData';
import {
  buildDefaultGroups,
  createGroup,
  createGroupForCategory,
  createGroupFromLayoutTemplate,
  getGroupsForCategory,
  layoutKey,
  nextSortOrder,
  removeCategoryGroups,
  reorderCategoryGroups,
} from '../panelConfig/panelStructure.js';
import { createDefaultGroupLayoutState, createEmptyZoneLayout, slugify } from '../panelConfig/panelZones.js';
import { usePanelLayoutSlot } from '../panelConfig/panelLayoutSlot.jsx';
import {
  getBuiltinTemplateIds,
  initBuiltinGroupLayouts,
  seedBuiltinGroupLayout,
} from '../panelConfig/builtinGroupDefaults.js';
import {
  getCategoryGroupTemplateIds,
  seedCategoryGroupLayout,
} from '../panelConfig/categoryGroupDefaults.js';
import {
  isContainerLayoutGroup,
  mergeContainerSlotTemplatesIntoCatalog,
} from '../panelConfig/containerGroupDefaults.js';
import { CONTAINER_LAYOUT_LIBRARY, isCategoryPanelGroup, isStaticTemplateGroup } from '../data/categoryPanelGroups.js';
import {
  createContainerSlotTemplates,
  getContainerLayoutDef,
  isContainerSlotForGroup,
} from '../data/containerLayoutPresets.js';
import { initAllGroupLayouts } from '../panelConfig/initGroupLayouts.js';
import { relayoutActiveLayout } from '../panelConfig/gridRelayout.js';
import { isBase44Backend } from '../services/backend.js';
import { uploadPanelTemplateFile } from '../services/base44Api.js';
import { buildPanelEditPayload, hydratePanelConfigFromRaw, savePanelConfig } from '../services/panelConfigService.js';
import { panelConfigByteSize, preparePanelConfigForSave, isDefaultPanelTemplate, parsePanelConfigImport } from '../services/panelConfigSerialize.js';
import { PANEL_EDIT_SCOPES, applyVisibility } from '../services/panelRouting.js';
import {
  VariantTabBar,
  buildVariantTabs,
  activeTabIdFromScope,
  scopeFromTab,
} from './components/VariantTabBar.jsx';
import './layoutBuilder.css';

const PANEL_W = tokens.panelW;
const SIDEBAR_W = tokens.panelSidebarW;

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function PanelEditMode({
  onClose,
  initialPanel,
  onPanelSave,
  pageLabel,
  editScope = PANEL_EDIT_SCOPES.PAGE,
  onEditScopeChange,
  onVariantTabChange,
  pageVisibility,
  onPageVisibilityChange,
}) {
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [groups, setGroups] = useState(() => buildDefaultGroups(DEFAULT_CATEGORIES));
  const [groupLayouts, setGroupLayouts] = useState({});
  const [activeCategoryId, setActiveCategoryId] = useState('home');
  const [activeGroupId, setActiveGroupId] = useState('grp-branded');
  const [layoutLayer, setLayoutLayer] = useState('preview');
  const [templates, setTemplates] = useState([]);
  const [layoutName, setLayoutName] = useState('');
  const [editMode, setEditMode] = useState(true);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [newGroupName, setNewGroupName] = useState('');
  const [renameGroupName, setRenameGroupName] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const uploadInputRef = useRef(null);
  const replaceInputRef = useRef(null);
  const panelImportRef = useRef(null);
  const replaceTemplateIdRef = useRef(null);
  const autosaveTimerRef = useRef(null);
  const skipAutosaveRef = useRef(true);
  const pendingSaveRef = useRef(null);
  const prevInitialPanelRef = useRef(initialPanel);
  const isLoadingRef = useRef(true);
  const templatesRef = useRef([]);

  const activeLayoutKey = layoutKey(activeGroupId, layoutLayer);
  const zoneLayout = groupLayouts[activeLayoutKey] ?? createDefaultGroupLayoutState();

  const categoryGroups = useMemo(
    () => getGroupsForCategory(groups, activeCategoryId),
    [groups, activeCategoryId],
  );

  const layoutTemplatesInCategory = useMemo(
    () => new Set(categoryGroups.map(g => g.layoutTemplateId).filter(Boolean)),
    [categoryGroups],
  );

  const previewPanel = useMemo(() => {
    if (editScope !== PANEL_EDIT_SCOPES.PAGE) {
      return { categories, groups };
    }
    return applyVisibility({ categories, groups }, pageVisibility);
  }, [categories, groups, pageVisibility, editScope]);

  const previewCategories = previewPanel.categories;
  const previewGroups = previewPanel.groups;

  const activeGroup = useMemo(
    () => groups.find(g => g.id === activeGroupId) ?? categoryGroups[0],
    [groups, activeGroupId, categoryGroups],
  );

  const updateGroupLayout = useCallback((key, updater) => {
    setGroupLayouts(prev => ({
      ...prev,
      [key]: updater(prev[key] ?? createDefaultGroupLayoutState()),
    }));
  }, []);

  useEffect(() => {
    if (activeGroup) setRenameGroupName(activeGroup.name);
  }, [activeGroup?.id, activeGroup?.name]);

  // Keep built-in / category template lists in sync when switching groups
  useEffect(() => {
    if (!templates.length || !activeGroup) return;
    const defaultIds = activeGroup.builtin
      ? getBuiltinTemplateIds(activeGroup, templates)
      : isCategoryPanelGroup(activeGroup)
        ? getCategoryGroupTemplateIds(activeGroup, templates)
        : [];
    if (!defaultIds.length) return;
    updateGroupLayout(activeLayoutKey, prev => {
      if (prev.orderedTemplateIds?.length) return prev;
      return { ...prev, orderedTemplateIds: defaultIds };
    });
  }, [activeGroup?.id, activeGroup?.builtin, activeLayoutKey, templates, updateGroupLayout]);

  // ── Init (once per mount — remount when site/page/scope key changes) ───────
  useEffect(() => {
    let cancelled = false;
    const panelSnapshot = initialPanel;
    const initTimeout = window.setTimeout(() => {
      if (cancelled) return;
      setLoadError('Panel editor is taking too long — check your network and try again.');
      setIsLoading(false);
    }, 20_000);

    (async () => {
      setIsLoading(true);
      setLoadError(null);

      try {
        const loadedTemplates = await loadInitialTemplates();
        if (cancelled) return;

        const saved = panelSnapshot?.categories?.length ? panelSnapshot : null;

        if (saved?.categories?.length) {
          const hydrated = hydratePanelConfigFromRaw(saved, loadedTemplates) ?? saved;
          const cats = hydrated.categories;
          const grps = hydrated.groups;

          setCategories(cats);
          setGroups(grps);
          setGroupLayouts(hydrated.groupLayouts);
          setTemplates(hydrated.templates);
          if (hydrated.layoutName) setLayoutName(hydrated.layoutName);
          setActiveCategoryId(cats[0]?.id ?? 'home');
          setActiveGroupId(grps.find(g => g.categoryId === (cats[0]?.id ?? 'home'))?.id ?? 'grp-branded');
        } else {
          const initialGroups = buildDefaultGroups(DEFAULT_CATEGORIES);
          const allTemplates = mergeContainerSlotTemplatesIntoCatalog(initialGroups, loadedTemplates);
          const initialLayouts = initAllGroupLayouts(
            initialGroups,
            allTemplates,
            createDefaultGroupLayoutState,
          );

          setTemplates(allTemplates);
          setGroups(initialGroups);
          setGroupLayouts(initialLayouts);
          setActiveCategoryId('home');
          setActiveGroupId('grp-branded');
        }
      } catch (err) {
        console.error('[PanelEditMode] init failed', err);
        if (!cancelled) {
          setLoadError(err?.message || 'Failed to load panel editor');
        }
      } finally {
        window.clearTimeout(initTimeout);
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      window.clearTimeout(initTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- init once per mount; parent key handles page changes
  }, []);

  // Keep refs in sync so the re-hydration effect can read current values without deps
  useEffect(() => { isLoadingRef.current = isLoading; }, [isLoading]);
  useEffect(() => { templatesRef.current = templates; }, [templates]);

  // Re-hydrate when initialPanel changes after mount (scope tab switch or JSON import).
  // Uses ref comparison so this never fires on first render — only on genuine prop changes.
  useEffect(() => {
    if (prevInitialPanelRef.current === initialPanel) return;
    prevInitialPanelRef.current = initialPanel;

    // If initial async load is still in flight, it will read `initialPanel` directly — skip.
    if (isLoadingRef.current) return;

    const currentTemplates = templatesRef.current;
    const panelSnapshot = initialPanel;
    const saved = panelSnapshot?.categories?.length ? panelSnapshot : null;

    skipAutosaveRef.current = true;

    if (saved?.categories?.length) {
      const hydrated = hydratePanelConfigFromRaw(saved, currentTemplates) ?? saved;
      const cats = hydrated.categories;
      const grps = hydrated.groups;
      setCategories(cats);
      setGroups(grps);
      setGroupLayouts(hydrated.groupLayouts ?? {});
      if (hydrated.layoutName) setLayoutName(hydrated.layoutName);
      setActiveCategoryId(cats[0]?.id ?? 'home');
      setActiveGroupId(
        grps.find(g => g.categoryId === (cats[0]?.id ?? 'home'))?.id ?? 'grp-branded',
      );
    } else {
      const initialGroups = buildDefaultGroups(DEFAULT_CATEGORIES);
      const allTemplates = mergeContainerSlotTemplatesIntoCatalog(initialGroups, currentTemplates);
      const initialLayouts = initAllGroupLayouts(initialGroups, allTemplates, createDefaultGroupLayoutState);
      setGroups(initialGroups);
      setGroupLayouts(initialLayouts);
      setActiveCategoryId('home');
      setActiveGroupId('grp-branded');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally only re-runs on initialPanel identity change
  }, [initialPanel]);

  const buildPayload = useCallback(() => buildPanelEditPayload({
    layoutName,
    categories,
    groups,
    templates,
    groupLayouts,
  }), [layoutName, categories, groups, templates, groupLayouts]);

  const persistPanel = useCallback(async (payload) => {
    if (onPanelSave) {
      return onPanelSave(payload);
    }
    await savePanelConfig(payload);
    return { storage: 'local' };
  }, [onPanelSave]);

  const applyImportedPanelConfig = useCallback(async (raw) => {
    const parsed = parsePanelConfigImport(raw);
    const loadedTemplates = templates.length ? templates : await loadInitialTemplates();
    const hydrated = hydratePanelConfigFromRaw(parsed, loadedTemplates) ?? parsed;
    const cats = hydrated.categories;
    const grps = hydrated.groups;

    skipAutosaveRef.current = true;
    setCategories(cats);
    setGroups(grps);
    setGroupLayouts(hydrated.groupLayouts ?? {});
    setTemplates(hydrated.templates ?? loadedTemplates);
    if (hydrated.layoutName) setLayoutName(hydrated.layoutName);
    setActiveCategoryId(cats[0]?.id ?? 'home');
    setActiveGroupId(grps.find(g => g.categoryId === (cats[0]?.id ?? 'home'))?.id ?? grps[0]?.id ?? 'grp-branded');

    const payload = buildPanelEditPayload({
      layoutName: hydrated.layoutName ?? layoutName,
      categories: cats,
      groups: grps,
      templates: hydrated.templates ?? loadedTemplates,
      groupLayouts: hydrated.groupLayouts ?? {},
    });

    const result = await persistPanel(payload);
    const scope = editScope === PANEL_EDIT_SCOPES.GLOBAL ? 'global' : 'this page';
    const storage = result?.base44Error ? 'local' : (result?.storage ?? 'local');
    setSaveStatus(`Imported panel · saved to ${scope} (${storage})`);
    setTimeout(() => setSaveStatus(''), 4000);
  }, [templates, layoutName, editScope, persistPanel]);

  const handleImportPanelFile = useCallback(async (file) => {
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const scope = editScope === PANEL_EDIT_SCOPES.GLOBAL ? 'global panel (all pages)' : 'this page';
      const ok = window.confirm(`Import panel layout into ${scope}?`);
      if (!ok) return;
      await applyImportedPanelConfig(raw);
    } catch (err) {
      console.error('[PanelEditMode] import failed', err);
      setSaveStatus(`Import failed — ${err?.message ?? 'invalid file'}`);
      setTimeout(() => setSaveStatus(''), 4000);
    }
  }, [applyImportedPanelConfig, editScope]);

  const handleExportPanel = useCallback(() => {
    downloadJson(`panel-config-${Date.now()}.json`, buildPayload());
    setSaveStatus('Panel JSON downloaded');
    setTimeout(() => setSaveStatus(''), 2500);
  }, [buildPayload]);

  const variantTabs = useMemo(
    () => buildVariantTabs({ includeGlobal: true, includePage: true }),
    [],
  );

  const activeVariantTabId = activeTabIdFromScope(editScope);

  const isGroupHiddenOnPage = useCallback((groupId) => {
    return (pageVisibility?.hiddenGroups ?? []).includes(groupId);
  }, [pageVisibility]);

  const isCategoryHiddenOnPage = useCallback((categoryId) => {
    return (pageVisibility?.hiddenCategories ?? []).includes(categoryId);
  }, [pageVisibility]);

  const toggleGroupVisibilityOnPage = useCallback((groupId) => {
    if (!onPageVisibilityChange) return;
    const hidden = new Set(pageVisibility?.hiddenGroups ?? []);
    if (hidden.has(groupId)) hidden.delete(groupId);
    else hidden.add(groupId);
    onPageVisibilityChange({
      hiddenGroups: [...hidden],
      hiddenCategories: pageVisibility?.hiddenCategories ?? [],
    });
  }, [onPageVisibilityChange, pageVisibility]);

  const toggleCategoryVisibilityOnPage = useCallback((categoryId) => {
    if (!onPageVisibilityChange) return;
    const hidden = new Set(pageVisibility?.hiddenCategories ?? []);
    if (hidden.has(categoryId)) hidden.delete(categoryId);
    else hidden.add(categoryId);
    onPageVisibilityChange({
      hiddenCategories: [...hidden],
      hiddenGroups: pageVisibility?.hiddenGroups ?? [],
    });
  }, [onPageVisibilityChange, pageVisibility]);

  const handleVariantTabSelect = useCallback(async (tab) => {
    const nextScope = scopeFromTab(tab);
    if (nextScope === editScope) return;

    try {
      await persistPanel(buildPayload());
    } catch (err) {
      console.warn('[PanelEditMode] save before tab switch failed', err);
    }

    if (onVariantTabChange) {
      await onVariantTabChange(tab);
    } else {
      onEditScopeChange?.(nextScope);
    }
  }, [buildPayload, editScope, onEditScopeChange, onVariantTabChange, persistPanel]);

  useEffect(() => {
    if (isLoading) skipAutosaveRef.current = true;
  }, [isLoading]);

  useEffect(() => {
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    if (!isBase44Backend() || isLoading) return;

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(async () => {
      const payload = buildPayload();
      setSaveStatus('Saving to Base44…');
      try {
        pendingSaveRef.current = persistPanel(payload);
        await pendingSaveRef.current;
        setSaveStatus('Saved to Base44');
      } catch (err) {
        console.error('[PanelEditMode] autosave failed', err);
        const msg = err?.code === 'PANEL_CONFIG_TOO_LARGE'
          ? `Too large for Base44 (${err.size} bytes)`
          : `Save failed — ${err?.message ?? 'unknown error'}`;
        setSaveStatus(msg);
      } finally {
        pendingSaveRef.current = null;
        setTimeout(() => setSaveStatus(''), 3000);
      }
    }, 1500);

    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [layoutName, categories, groups, templates, groupLayouts, isLoading, buildPayload, persistPanel]);

  const templatesById = useMemo(
    () => templates.reduce((acc, t) => { acc[t.id] = t; return acc; }, {}),
    [templates],
  );

  const orderedTemplateIds = zoneLayout.orderedTemplateIds ?? [];
  const gridEngine = zoneLayout.gridEngine ?? { version: 1, defaultPresetId: 'default', breakpoints: [] };
  const activeBreakpointKey = zoneLayout.activeBreakpointKey ?? 'bp-narrow';

  const activeBreakpoint = useMemo(
    () => gridEngine.breakpoints.find(bp => bp.key === activeBreakpointKey) ?? null,
    [gridEngine.breakpoints, activeBreakpointKey],
  );

  const contentAreaWidth = PANEL_W - SIDEBAR_W;
  const canvasWidth = Math.max(100, contentAreaWidth - (zoneLayout.containerPadding ?? 12) * 2);

  useEffect(() => {
    if (!orderedTemplateIds.length || !activeBreakpoint) return;
    updateGroupLayout(activeLayoutKey, prev => {
      const bp = prev.gridEngine.breakpoints.find(b => b.key === prev.activeBreakpointKey);
      if (!bp?.items?.length) return prev;
      const normalized = normalizeLayoutItems(bp.items, prev.orderedTemplateIds, bp.gridConfig.cols);
      return {
        ...prev,
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(b =>
            b.key === prev.activeBreakpointKey ? { ...b, items: normalized } : b,
          ),
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLayoutKey, activeBreakpointKey]);

  const updateBreakpoint = useCallback((key, updater) => {
    updateGroupLayout(activeLayoutKey, prev => ({
      ...prev,
      gridEngine: {
        ...prev.gridEngine,
        breakpoints: prev.gridEngine.breakpoints.map(bp =>
          bp.key === key ? updater(bp) : bp,
        ),
      },
    }));
  }, [activeLayoutKey, updateGroupLayout]);

  const handleLayoutChange = useCallback((items) => {
    updateBreakpoint(activeBreakpointKey, bp => ({ ...bp, items }));
  }, [activeBreakpointKey, updateBreakpoint]);

  const handleSelectBreakpoint = useCallback((key) => {
    updateGroupLayout(activeLayoutKey, prev => ({ ...prev, activeBreakpointKey: key }));
  }, [activeLayoutKey, updateGroupLayout]);

  const selectCategory = useCallback((categoryId) => {
    setActiveCategoryId(categoryId);
    const catGroups = getGroupsForCategory(groups, categoryId);
    if (catGroups.length) setActiveGroupId(catGroups[0].id);
  }, [groups]);

  useEffect(() => {
    if (editScope !== PANEL_EDIT_SCOPES.PAGE) return;
    if (!previewCategories.some(c => c.id === activeCategoryId)) {
      const nextCat = previewCategories[0]?.id ?? 'home';
      if (nextCat !== activeCategoryId) selectCategory(nextCat);
    }
  }, [editScope, previewCategories, activeCategoryId, selectCategory]);

  useEffect(() => {
    if (editScope !== PANEL_EDIT_SCOPES.PAGE) return;
    if (!previewGroups.some(g => g.id === activeGroupId)) {
      const inCat = getGroupsForCategory(previewGroups, activeCategoryId);
      if (inCat[0]?.id && inCat[0].id !== activeGroupId) {
        setActiveGroupId(inCat[0].id);
      }
    }
  }, [editScope, previewGroups, activeGroupId, activeCategoryId]);

  const handleTabChange = useCallback((tab) => {
    if (tab === 'Elements') selectCategory('home');
  }, [selectCategory]);

  const handleCategoryChange = useCallback((categoryId) => {
    selectCategory(categoryId);
  }, [selectCategory]);

  const handleSelectGroup = useCallback((groupId) => {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    setActiveGroupId(groupId);
    setActiveCategoryId(group.categoryId);
  }, [groups]);

  const uploadTemplateFile = useCallback(async (file) => {
    if (!file?.type?.startsWith('image/')) return null;
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    let src = dataUrl;
    if (isBase44Backend()) {
      try {
        src = await uploadPanelTemplateFile(file);
      } catch (err) {
        console.warn('[PanelEditMode] Base44 upload failed, using inline preview', err);
        src = dataUrl;
      }
    }
    const size = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 240, height: 160 });
      img.src = src;
    });
    return {
      src,
      width: size.width,
      height: size.height,
      name: file.name.replace(/\.[^.]+$/, ''),
    };
  }, []);

  const handleUploadFiles = useCallback(async (files) => {
    if (!files?.length) return;
    const newTemplates = [];
    const newIds = [];

    for (const file of Array.from(files)) {
      const uploaded = await uploadTemplateFile(file);
      if (!uploaded) continue;
      const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      newTemplates.push({ id, ...uploaded });
      newIds.push(id);
    }

    if (!newTemplates.length) return;
    setTemplates(prev => [...prev, ...newTemplates]);
    updateGroupLayout(activeLayoutKey, prev => ({
      ...prev,
      orderedTemplateIds: [...(prev.orderedTemplateIds ?? []), ...newIds],
    }));
  }, [activeLayoutKey, updateGroupLayout, uploadTemplateFile]);

  const handleReplaceTemplate = useCallback((templateId) => {
    replaceTemplateIdRef.current = templateId;
    replaceInputRef.current?.click();
  }, []);

  const handleReplaceFile = useCallback(async (files) => {
    const templateId = replaceTemplateIdRef.current;
    replaceTemplateIdRef.current = null;
    if (!templateId || !files?.length) return;

    const uploaded = await uploadTemplateFile(files[0]);
    if (!uploaded) return;

    setTemplates(prev => prev.map(t =>
      t.id === templateId
        ? { ...t, ...uploaded, isPlaceholder: false, containerSlot: t.containerSlot ?? isContainerSlotForGroup(templateId, activeGroup) }
        : t,
    ));
  }, [activeGroup, uploadTemplateFile]);

  const handleReorder = useCallback((fromIndex, toIndex) => {
    if (fromIndex === toIndex) return;
    updateGroupLayout(activeLayoutKey, prev => {
      const ids = [...(prev.orderedTemplateIds ?? [])];
      const [moved] = ids.splice(fromIndex, 1);
      if (moved === undefined) return prev;
      ids.splice(toIndex, 0, moved);
      return relayoutActiveLayout(
        { ...prev, orderedTemplateIds: ids },
        templates,
        templatesById,
        canvasWidth,
      );
    });
  }, [activeLayoutKey, updateGroupLayout, templates, templatesById, canvasWidth]);

  const handleRemoveTemplate = useCallback((templateId) => {
    if (isContainerSlotForGroup(templateId, activeGroup)) return;

    const removed = templates.find(t => t.id === templateId);
    const dropFromCatalog = removed && !isDefaultPanelTemplate(removed);

    if (dropFromCatalog) {
      setTemplates(prev => prev.filter(t => t.id !== templateId));
    }

    updateGroupLayout(activeLayoutKey, prev => {
      const ids = (prev.orderedTemplateIds ?? []).filter(id => id !== templateId);
      const nextScales = { ...(prev.templateScales ?? {}) };
      delete nextScales[templateId];
      const nextFit = { ...(prev.templateObjectFit ?? {}) };
      delete nextFit[templateId];
      const nextPad = { ...(prev.templatePadding ?? {}) };
      delete nextPad[templateId];
      const nextBadges = { ...(prev.templateBadges ?? {}) };
      delete nextBadges[templateId];

      const catalogTemplates = dropFromCatalog
        ? templates.filter(t => t.id !== templateId)
        : templates;
      const catalogById = catalogTemplates.reduce((acc, t) => { acc[t.id] = t; return acc; }, {});

      const next = {
        ...prev,
        orderedTemplateIds: ids,
        templateScales: nextScales,
        templateObjectFit: nextFit,
        templatePadding: nextPad,
        templateBadges: nextBadges,
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(bp => ({
            ...bp,
            items: (bp.items ?? []).filter(item => item.i !== templateId),
          })),
        },
      };

      return relayoutActiveLayout(next, catalogTemplates, catalogById, canvasWidth);
    });
  }, [activeLayoutKey, updateGroupLayout, templates, canvasWidth]);

  const handleApplyPreset = useCallback((presetId) => {
    if (!activeBreakpoint) return;
    const collageAutoParams = presetId === 'collage-auto' ? {
      containerWidth: canvasWidth,
      gap: activeBreakpoint.gridConfig.margin[0],
      paddingX: zoneLayout.itemPaddingX,
      paddingY: zoneLayout.itemPaddingY,
      settings: activeBreakpoint.collageSettings ?? { targetRowHeight: 200, minItemSize: 80, groupPattern: '' },
      templateScales: zoneLayout.templateScales ?? {},
    } : undefined;
    const rglParams = {
      containerWidth: canvasWidth,
      gap: activeBreakpoint.gridConfig.margin[0],
      rowHeight: activeBreakpoint.gridConfig.rowHeight,
    };
    const result = applyPreset(
      presetId, templates, orderedTemplateIds,
      activeBreakpoint.gridConfig.cols,
      collageAutoParams,
      rglParams,
    );
    updateGroupLayout(activeLayoutKey, prev => {
      const next = {
        ...prev,
        layoutSeeded: true,
        templateScales: {},
        templateObjectFit: {},
        templatePadding: {},
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(bp =>
            bp.key === activeBreakpointKey
              ? {
                  ...bp,
                  galleryLayout: result.galleryLayout ?? bp.galleryLayout,
                  gridConfig: {
                    ...bp.gridConfig,
                    ...(result.cols ? { cols: result.cols } : {}),
                    ...(result.rowHeight ? { rowHeight: result.rowHeight } : {}),
                  },
                  items: result.items,
                  presetId,
                }
              : bp,
          ),
        },
      };
      return next;
    });
  }, [activeBreakpoint, activeBreakpointKey, activeLayoutKey, canvasWidth, orderedTemplateIds, templates, updateBreakpoint, updateGroupLayout, zoneLayout]);

  const handleLayoutTypeChange = useCallback((type) => {
    updateGroupLayout(activeLayoutKey, prev => {
      const bp = prev.gridEngine.breakpoints.find(b => b.key === activeBreakpointKey);
      if (!bp) return prev;
      const needsCollageReseed = type === 'Collage' && bp.galleryLayout !== 'Collage';
      const currentIds = bp.items.map(i => i.i);
      return {
        ...prev,
        layoutSeeded: needsCollageReseed ? true : prev.layoutSeeded,
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(b =>
            b.key === activeBreakpointKey
              ? {
                  ...b,
                  galleryLayout: type,
                  compactor: type === 'Collage' ? 'none' : 'vertical',
                  items: needsCollageReseed ? seedCollageRows(currentIds, [3]) : b.items,
                  presetId: needsCollageReseed ? 'collage-rows-3' : b.presetId,
                  fluidity: {
                    ...b.fluidity,
                    withinBreakpoint: type === 'Flex' ? 'recalculate' : 'static',
                    structuralMode: type === 'Flex' ? 'autoFill' : 'fixed',
                  },
                }
              : b,
          ),
        },
      };
    });
  }, [activeBreakpointKey, activeLayoutKey, updateGroupLayout]);

  const patchActiveLayout = useCallback((patchBp) => {
    updateGroupLayout(activeLayoutKey, prev => {
      const next = {
        ...prev,
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(bp =>
            bp.key === activeBreakpointKey ? patchBp(bp) : bp,
          ),
        },
      };
      return relayoutActiveLayout(next, templates, templatesById, canvasWidth);
    });
  }, [activeLayoutKey, activeBreakpointKey, templates, templatesById, canvasWidth, updateGroupLayout]);

  const handleGridConfigChange = useCallback((field, value) => {
    patchActiveLayout(bp => ({
      ...bp,
      gridConfig: {
        ...bp.gridConfig,
        cols: field === 'cols' ? value : bp.gridConfig.cols,
        rowHeight: field === 'rowHeight' ? value : bp.gridConfig.rowHeight,
        margin: field === 'gap' ? [value, value] : bp.gridConfig.margin,
      },
    }));
  }, [patchActiveLayout]);

  const handleCollageSettingsChange = useCallback((field, value) => {
    patchActiveLayout(bp => ({
      ...bp,
      collageSettings: {
        targetRowHeight: bp.collageSettings?.targetRowHeight ?? 200,
        minItemSize: bp.collageSettings?.minItemSize ?? 80,
        groupPattern: bp.collageSettings?.groupPattern ?? '',
        [field]: value,
      },
    }));
  }, [patchActiveLayout]);

  const handleFlexSettingsChange = useCallback((field, value) => {
    updateBreakpoint(activeBreakpointKey, bp => ({
      ...bp,
      flexSettings: {
        minItemWidth: bp.flexSettings?.minItemWidth ?? 100,
        maxItemWidth: bp.flexSettings?.maxItemWidth ?? 240,
        itemHeight: bp.flexSettings?.itemHeight ?? 80,
        scrollable: bp.flexSettings?.scrollable ?? true,
        [field]: value,
      },
    }));
  }, [activeBreakpointKey, updateBreakpoint]);

  const handleAddCategory = useCallback(() => {
    const label = newCategoryLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (categories.some(c => c.id === id)) return;

    const group = createGroup({
      id: `grp-${id}-catalog`,
      name: label,
      categoryId: id,
      kind: 'catalog',
      sortOrder: 0,
    });

    setCategories(prev => [...prev, { id, label }]);
    setGroups(prev => [...prev, group]);
    setGroupLayouts(prev => ({
      ...prev,
      [layoutKey(group.id, 'preview')]: createDefaultGroupLayoutState(),
      [layoutKey(group.id, 'subgroup')]: createDefaultGroupLayoutState(),
    }));
    setNewCategoryLabel('');
    selectCategory(id);
  }, [categories, newCategoryLabel, selectCategory]);

  const handleDeleteCategory = useCallback((catId) => {
    if (catId === 'home') return;
    const { groups: nextGroups, groupLayouts: nextLayouts } = removeCategoryGroups(groups, groupLayouts, catId);
    setCategories(prev => prev.filter(c => c.id !== catId));
    setGroups(nextGroups);
    setGroupLayouts(nextLayouts);
    if (activeCategoryId === catId) selectCategory('home');
  }, [groups, groupLayouts, activeCategoryId, selectCategory]);

  const handleMoveGroup = useCallback((groupId, direction) => {
    const inCat = getGroupsForCategory(groups, activeCategoryId);
    const fromIndex = inCat.findIndex(g => g.id === groupId);
    const toIndex = fromIndex + direction;
    if (fromIndex < 0 || toIndex < 0 || toIndex >= inCat.length) return;
    setGroups(prev => reorderCategoryGroups(prev, activeCategoryId, fromIndex, toIndex));
  }, [groups, activeCategoryId]);

  const handleAddGroup = useCallback(() => {
    const name = newGroupName.trim();
    if (!name) return;
    const group = createGroupForCategory(name, activeCategoryId, nextSortOrder(groups, activeCategoryId));
    setGroups(prev => [...prev, group]);
    setGroupLayouts(prev => ({
      ...prev,
      [layoutKey(group.id, 'preview')]: createDefaultGroupLayoutState(),
      [layoutKey(group.id, 'subgroup')]: createDefaultGroupLayoutState(),
    }));
    setActiveGroupId(group.id);
    setNewGroupName('');
    setRenameGroupName(name);
  }, [activeCategoryId, newGroupName, groups]);

  const handleAddLayoutTemplate = useCallback((template) => {
    const def = getContainerLayoutDef(template.id);
    if (!def) return;

    const group = createGroupFromLayoutTemplate(
      template,
      activeCategoryId,
      nextSortOrder(groups, activeCategoryId),
    );
    const slotTemplates = createContainerSlotTemplates(group.id, def);
    const allTemplates = [...templates, ...slotTemplates];
    const previewKey = layoutKey(group.id, 'preview');
    const subgroupKey = layoutKey(group.id, 'subgroup');
    let previewState = createDefaultGroupLayoutState();
    let subgroupState = createDefaultGroupLayoutState();
    previewState = seedCategoryGroupLayout(group, allTemplates, previewState, canvasWidth);
    subgroupState = seedCategoryGroupLayout(group, allTemplates, subgroupState, canvasWidth);

    setTemplates(allTemplates);
    setGroups(prev => [...prev, group]);
    setGroupLayouts(prev => ({
      ...prev,
      [previewKey]: previewState,
      [subgroupKey]: subgroupState,
    }));
    setActiveGroupId(group.id);
    setRenameGroupName(group.name);
  }, [activeCategoryId, groups, templates, canvasWidth]);

  const handleRenameGroup = useCallback(() => {
    const name = renameGroupName.trim();
    if (!name || !activeGroupId) return;
    setGroups(prev => prev.map(g => g.id === activeGroupId ? { ...g, name } : g));
  }, [activeGroupId, renameGroupName]);

  const handleSeedBuiltin = useCallback(() => {
    if (!activeGroup) return;
    if (activeGroup.builtin) {
      updateGroupLayout(activeLayoutKey, prev =>
        seedBuiltinGroupLayout(activeGroup, templates, prev, canvasWidth),
      );
      return;
    }
    if (isCategoryPanelGroup(activeGroup)) {
      updateGroupLayout(activeLayoutKey, prev =>
        seedCategoryGroupLayout(activeGroup, templates, prev, canvasWidth),
      );
    }
  }, [activeGroup, activeLayoutKey, templates, canvasWidth, updateGroupLayout]);

  const handleClearLayout = useCallback(() => {
    updateGroupLayout(activeLayoutKey, prev => {
      const defaultIds = activeGroup?.builtin
        ? getBuiltinTemplateIds(activeGroup, templates)
        : isCategoryPanelGroup(activeGroup)
          ? getCategoryGroupTemplateIds(activeGroup, templates)
          : [];
      return {
        ...prev,
        layoutSeeded: false,
        orderedTemplateIds: defaultIds,
        gridEngine: {
          ...prev.gridEngine,
          breakpoints: prev.gridEngine.breakpoints.map(bp => ({
            ...bp,
            items: [],
          })),
        },
        templateScales: {},
        templateObjectFit: {},
        templatePadding: {},
      };
    });
  }, [activeGroup, activeLayoutKey, templates, updateGroupLayout]);

  const activeLayoutHasItems = (activeBreakpoint?.items?.length ?? 0) > 0;

  const handleDeleteGroup = useCallback(() => {
    const group = groups.find(g => g.id === activeGroupId);
    if (!group || group.kind === 'builtin') return;
    if (group.kind === 'templates' && isStaticTemplateGroup(group) && !group.layoutTemplateId) return;
    setGroups(prev => prev.filter(g => g.id !== activeGroupId));
    setGroupLayouts(prev => {
      const next = { ...prev };
      delete next[layoutKey(activeGroupId, 'preview')];
      delete next[layoutKey(activeGroupId, 'subgroup')];
      return next;
    });
    const remaining = getGroupsForCategory(
      groups.filter(g => g.id !== activeGroupId),
      activeCategoryId,
    );
    if (remaining.length) setActiveGroupId(remaining[0].id);
  }, [activeGroupId, activeCategoryId, groups]);

  const handleSave = useCallback(async () => {
    const payload = buildPayload();
    const scopeLabel = editScope === PANEL_EDIT_SCOPES.GLOBAL ? 'global' : 'this page';

    setSaveStatus('Saving…');
    try {
      const slim = preparePanelConfigForSave(payload);
      const result = await persistPanel(payload);
      const storage = result?.base44Error ? 'local' : (result?.storage === 'base44' ? 'Base44' : 'local');
      let msg = `Saved ${scopeLabel} panel → ${storage} (${panelConfigByteSize(slim)} bytes)`;
      if (result?.base44Error) {
        msg += ' — Base44 sync failed, kept locally';
      }
      setSaveStatus(msg);
    } catch (err) {
      console.error('[panelConfig] save failed', err);
      setSaveStatus(`Save failed — ${err?.message ?? 'unknown error'}`);
    }
    setTimeout(() => setSaveStatus(''), 5000);
  }, [buildPayload, persistPanel, editScope]);

  const handleClose = useCallback(async () => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    if (isBase44Backend() && !isLoading) {
      try {
        if (pendingSaveRef.current) await pendingSaveRef.current;
        else await persistPanel(buildPayload());
      } catch (err) {
        console.warn('[PanelEditMode] close save failed', err);
      }
    }
    onClose?.();
  }, [onClose, isLoading, buildPayload, persistPanel]);

  const getLayoutSlot = usePanelLayoutSlot({
    groupLayouts,
    templatesById,
    groups,
    editMode,
    activeGroupId,
    layoutLayer,
    onLayoutChange: handleLayoutChange,
    requireExplicitSeed: false,
  });

  if (isLoading) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 8, color: tokens.text3, fontFamily: tokens.fontUI, fontSize: 13,
      }}>
        <span>Loading panel editor…</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        gap: 12, padding: 24, color: tokens.text2, fontFamily: tokens.fontUI, fontSize: 13,
      }}>
        <span style={{ color: '#e57373' }}>Could not load panel editor</span>
        <span style={{ fontSize: 11, color: tokens.text3, textAlign: 'center', maxWidth: 320 }}>{loadError}</span>
        {onClose && (
          <button type="button" className="lb-btn lb-btn-ghost" onClick={handleClose}>
            ← Back to Editor
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="lb-app" style={{ flex: 1, minHeight: 0 }}>
      <header className="lb-header">
        <div className="lb-header-top">
          <div className="lb-header-left">
            <h1>Panel Layout Builder</h1>
            <span className="lb-header-sub">
              {pageLabel ? `${pageLabel} · ` : ''}{activeGroup?.name ?? 'Group'} · {layoutLayer === 'preview' ? 'Preview' : 'Subgroup'}
            </span>
          </div>
          <div className="lb-header-actions">
            {onClose && (
              <button type="button" className="lb-btn lb-btn-ghost" onClick={handleClose}>
                ← Back to Editor
              </button>
            )}
            <button type="button" className="lb-btn lb-btn-ghost" onClick={() => panelImportRef.current?.click()}>
              Import JSON
            </button>
            <button type="button" className="lb-btn lb-btn-ghost" onClick={handleExportPanel}>
              Export JSON
            </button>
            <button className="lb-btn lb-btn-primary" onClick={handleSave}>
              {editScope === PANEL_EDIT_SCOPES.GLOBAL ? 'Save global panel' : 'Save for this page'}
            </button>
            <input
              ref={panelImportRef}
              type="file"
              accept="application/json,.json"
              style={{ display: 'none' }}
              onChange={e => {
                const file = e.target.files?.[0];
                if (file) void handleImportPanelFile(file);
                e.target.value = '';
              }}
            />
            {saveStatus && (
              <span className="lb-header-sub" style={{ marginLeft: 8 }}>{saveStatus}</span>
            )}
            <label className="lb-edit-toggle">
              <input type="checkbox" checked={editMode} onChange={e => setEditMode(e.target.checked)} />
              <span>Edit mode</span>
            </label>
          </div>
        </div>

        <VariantTabBar
          tabs={variantTabs}
          activeTabId={activeVariantTabId}
          onSelect={handleVariantTabSelect}
        />
      </header>

      <div className="lb-body" style={{ minHeight: 0 }}>
        <aside className="lb-left" style={{ overflowY: 'auto' }}>
          {editScope === PANEL_EDIT_SCOPES.PAGE && (
            <section className="lp-section">
              <div className="lp-section-title">This page</div>
              <p className="pem-hint">
                Layout changes here apply only to <strong>{pageLabel ?? 'the current page'}</strong>.
                Use the eye icon to hide groups on this page. Click <strong>Save for this page</strong> when done.
              </p>
            </section>
          )}
          {editScope === PANEL_EDIT_SCOPES.GLOBAL && (
            <section className="lp-section">
              <div className="lp-section-title">Global panel</div>
              <p className="pem-hint">
                Changes here apply to every page unless a page has its own layout override.
              </p>
            </section>
          )}

          <section className="lp-section">
            <div className="lp-section-title">Categories (sidebar)</div>
            <ul className="pem-cat-list">
              {categories.map(cat => {
                const catHidden = isCategoryHiddenOnPage(cat.id);
                return (
                <li key={cat.id} className="pem-cat-item">
                  {editScope === PANEL_EDIT_SCOPES.PAGE && cat.id !== 'home' && (
                    <button
                      type="button"
                      className={`pem-visibility-btn${catHidden ? ' is-hidden' : ''}`}
                      title={catHidden ? 'Show category on this page' : 'Hide category on this page'}
                      onClick={() => toggleCategoryVisibilityOnPage(cat.id)}
                    >
                      {catHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`pem-cat-pick${activeCategoryId === cat.id ? ' active' : ''}${catHidden ? ' pem-hidden-item' : ''}`}
                    onClick={() => selectCategory(cat.id)}
                  >
                    {cat.label}
                  </button>
                  {cat.id !== 'home' && (
                    <button type="button" className="pem-cat-remove" onClick={() => handleDeleteCategory(cat.id)}>
                      Remove
                    </button>
                  )}
                </li>
              );})}
            </ul>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                type="text"
                className="lp-input"
                placeholder="New category"
                value={newCategoryLabel}
                onChange={e => setNewCategoryLabel(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddCategory()}
              />
              <button type="button" className="lp-seed-btn" onClick={handleAddCategory}>+</button>
            </div>
          </section>

          <section className="lp-section">
            <div className="lp-section-title">Groups in {categories.find(c => c.id === activeCategoryId)?.label}</div>
            <p className="pem-hint">Use ↑↓ to switch section order in the panel preview.</p>
            <ul className="pem-cat-list">
              {categoryGroups.map((group, index) => {
                const groupHidden = isGroupHiddenOnPage(group.id);
                return (
                <li key={group.id} className="pem-cat-item">
                  <div className="pem-group-order">
                    <button
                      type="button"
                      className="lp-move-btn"
                      title="Move section up"
                      disabled={index === 0}
                      onClick={() => handleMoveGroup(group.id, -1)}
                    >↑</button>
                    <button
                      type="button"
                      className="lp-move-btn"
                      title="Move section down"
                      disabled={index === categoryGroups.length - 1}
                      onClick={() => handleMoveGroup(group.id, 1)}
                    >↓</button>
                  </div>
                  {editScope === PANEL_EDIT_SCOPES.PAGE && (
                    <button
                      type="button"
                      className={`pem-visibility-btn${groupHidden ? ' is-hidden' : ''}`}
                      title={groupHidden ? 'Show group on this page' : 'Hide group on this page'}
                      onClick={() => toggleGroupVisibilityOnPage(group.id)}
                    >
                      {groupHidden ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  )}
                  <button
                    type="button"
                    className={`pem-cat-pick${activeGroupId === group.id ? ' active' : ''}${groupHidden ? ' pem-hidden-item' : ''}`}
                    onClick={() => handleSelectGroup(group.id)}
                  >
                    {group.name}
                    {group.kind === 'builtin' && <span className="pem-badge">built-in</span>}
                    {group.kind === 'templates' && !group.layoutTemplateId && (
                      <span className="pem-badge">templates</span>
                    )}
                    {group.layoutTemplateId && <span className="pem-badge">layout</span>}
                  </button>
                </li>
              );})}
            </ul>
            {categoryGroups.length === 0 && (
              <p className="pem-hint">No groups yet — add a layout below or create a custom group.</p>
            )}

            <div className="pem-layout-lib-section">
              <p className="pem-layout-lib-heading">Container layouts</p>
              <p className="pem-hint">
                Add a multi-slot layout — each gray container is an upload placeholder.
              </p>
              <ul className="pem-layout-lib">
                {CONTAINER_LAYOUT_LIBRARY.map(template => {
                  const alreadyAdded = layoutTemplatesInCategory.has(template.id);
                  return (
                    <li key={template.id} className="pem-layout-lib-item">
                      <img
                        src={template.path}
                        alt=""
                        className="pem-layout-lib-thumb"
                        draggable={false}
                      />
                      <div className="pem-layout-lib-meta">
                        <span className="pem-layout-lib-name">
                          {template.name}
                          {alreadyAdded && <span className="pem-layout-lib-added"> · in list</span>}
                        </span>
                        <button
                          type="button"
                          className="lp-seed-btn pem-layout-lib-add"
                          onClick={() => handleAddLayoutTemplate(template)}
                        >
                          Add
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
              <input
                type="text"
                className="lp-input"
                placeholder="New group name"
                value={newGroupName}
                onChange={e => setNewGroupName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddGroup()}
              />
              <button type="button" className="lp-seed-btn" onClick={handleAddGroup}>+</button>
            </div>
            {activeGroup && (
              <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                <input
                  type="text"
                  className="lp-input"
                  value={renameGroupName}
                  onChange={e => setRenameGroupName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleRenameGroup()}
                />
                <button type="button" className="lp-seed-btn" onClick={handleRenameGroup}>✓</button>
              </div>
            )}
            {activeGroup?.kind !== 'builtin'
              && !(activeGroup?.kind === 'templates' && isStaticTemplateGroup(activeGroup) && !activeGroup?.layoutTemplateId) && (
              <button type="button" className="lb-btn lb-btn-ghost" style={{ width: '100%', fontSize: 11 }} onClick={handleDeleteGroup}>
                Delete group
              </button>
            )}
            {(activeGroup?.kind === 'builtin' || activeGroup?.kind === 'templates') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                <button type="button" className="lp-seed-btn" style={{ width: '100%' }} onClick={handleSeedBuiltin}>
                  {activeGroup.kind === 'builtin' ? 'Seed built-in layout →' : 'Reseed template layout →'}
                </button>
                {activeLayoutHasItems && (
                  <button type="button" className="lb-btn lb-btn-ghost" style={{ width: '100%', fontSize: 11 }} onClick={handleClearLayout}>
                    Reset to default view
                  </button>
                )}
                <p className="pem-hint">
                  {activeGroup.kind === 'builtin'
                    ? 'Built-in groups show default UI until seeded. Templates listed below are editable.'
                    : isContainerLayoutGroup(activeGroup)
                      ? 'Each container slot can be filled via Replace in Templates below.'
                      : 'Template groups are pre-seeded from section assets. Adjust layout below or reseed.'}
                </p>
              </div>
            )}
          </section>

          <section className="lp-section">
            <div className="lp-section-title">Layout layer</div>
            <div className="lp-layout-types">
              <button
                type="button"
                className={`lp-type-btn${layoutLayer === 'preview' ? ' active' : ''}`}
                onClick={() => setLayoutLayer('preview')}
              >
                Preview
              </button>
              <button
                type="button"
                className={`lp-type-btn${layoutLayer === 'subgroup' ? ' active' : ''}`}
                onClick={() => setLayoutLayer('subgroup')}
              >
                Subgroup
              </button>
            </div>
            <p className="pem-hint">
              Preview = small row in panel. Subgroup = full drill-in after See more.
            </p>
          </section>

          <LeftPanel
            layoutName={layoutName}
            subgroups={[]}
            selectedSubgroupId=""
            hideSubgroupSelector
            orderedTemplateIds={orderedTemplateIds}
            templatesById={templatesById}
            breakpoints={gridEngine.breakpoints}
            activeBreakpointKey={activeBreakpointKey}
            activeBreakpoint={activeBreakpoint}
            containerPadding={zoneLayout.containerPadding ?? 12}
            itemPaddingX={zoneLayout.itemPaddingX ?? 8}
            itemPaddingY={zoneLayout.itemPaddingY ?? 8}
            itemBorderRadius={zoneLayout.itemBorderRadius ?? 10}
            templateScales={zoneLayout.templateScales ?? {}}
            templateObjectFit={zoneLayout.templateObjectFit ?? {}}
            templatePadding={zoneLayout.templatePadding ?? {}}
            onLayoutNameChange={setLayoutName}
            onSelectSubgroup={() => {}}
            onReorder={handleReorder}
            onRemoveTemplate={handleRemoveTemplate}
            onReplaceTemplate={handleReplaceTemplate}
            templateOrderLocked={isContainerLayoutGroup(activeGroup)}
            onSelectBreakpoint={handleSelectBreakpoint}
            onLayoutTypeChange={handleLayoutTypeChange}
            onApplyPreset={handleApplyPreset}
            onGridConfigChange={handleGridConfigChange}
            onContainerPaddingChange={v => updateGroupLayout(activeLayoutKey, prev =>
              relayoutActiveLayout({ ...prev, containerPadding: v }, templates, templatesById, canvasWidth),
            )}
            onItemPaddingXChange={v => updateGroupLayout(activeLayoutKey, prev =>
              relayoutActiveLayout({ ...prev, itemPaddingX: v }, templates, templatesById, canvasWidth),
            )}
            onItemPaddingYChange={v => updateGroupLayout(activeLayoutKey, prev =>
              relayoutActiveLayout({ ...prev, itemPaddingY: v }, templates, templatesById, canvasWidth),
            )}
            onItemBorderRadiusChange={v => updateGroupLayout(activeLayoutKey, prev => ({ ...prev, itemBorderRadius: v }))}
            onTemplateScaleChange={(id, scale) => updateGroupLayout(activeLayoutKey, prev =>
              relayoutActiveLayout({
                ...prev,
                templateScales: { ...prev.templateScales, [id]: scale },
              }, templates, templatesById, canvasWidth),
            )}
            onTemplateObjectFitChange={(id, fit) => updateGroupLayout(activeLayoutKey, prev => ({
              ...prev,
              templateObjectFit: { ...prev.templateObjectFit, [id]: fit },
            }))}
            onTemplatePaddingChange={(id, value) => updateGroupLayout(activeLayoutKey, prev => {
              const nextPad = { ...prev.templatePadding };
              if (value === undefined) delete nextPad[id];
              else nextPad[id] = value;
              return relayoutActiveLayout({ ...prev, templatePadding: nextPad }, templates, templatesById, canvasWidth);
            })}
            onCollageSettingsChange={handleCollageSettingsChange}
            onFlexSettingsChange={handleFlexSettingsChange}
            onUploadTemplates={() => uploadInputRef.current?.click()}
            templateBadges={zoneLayout.templateBadges ?? {}}
            onTemplateBadgeChange={(templateId, patch) => updateGroupLayout(activeLayoutKey, prev => ({
              ...prev,
              templateBadges: {
                ...(prev.templateBadges ?? {}),
                [templateId]: {
                  ...(prev.templateBadges?.[templateId] ?? {
                    enabled: false,
                    variant: 'text-icon',
                    label: 'Bookings',
                    darkContainer: true,
                  }),
                  ...patch,
                },
              },
            }))}
          />
        </aside>

        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={e => {
            handleUploadFiles(e.target.files);
            e.target.value = '';
          }}
        />

        <input
          ref={replaceInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={e => {
            handleReplaceFile(e.target.files);
            e.target.value = '';
          }}
        />

        <main className="lb-center" style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '24px 32px',
          overflow: 'auto',
          backgroundColor: tokens.bg0,
        }}>
          <div style={{
            height: 'calc(100vh - 120px)',
            minHeight: 640,
            boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
            borderRadius: 8,
            overflow: 'hidden',
          }}>
            <AddPanel
              panelEditMode
              categories={previewCategories}
              groups={previewGroups}
              controlledTab="Elements"
              controlledCategory={activeCategoryId}
              onTabChange={handleTabChange}
              onCategoryChange={handleCategoryChange}
              activeGroupId={activeGroupId}
              onSelectGroup={handleSelectGroup}
              onMoveGroup={handleMoveGroup}
              forcedDrillInGroupId={layoutLayer === 'subgroup' ? activeGroupId : null}
              getLayoutSlot={getLayoutSlot}
              editPreview={{
                groupId: activeGroupId,
                templateIds: orderedTemplateIds,
                templateBadges: zoneLayout.templateBadges ?? {},
              }}
              onClose={handleClose}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
