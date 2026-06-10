import React from 'react';
import { LeftPanel } from './components/LeftPanel';
import { CenterStage } from './components/CenterStage';
import {
  applyPreset,
  createDefaultBreakpoint,
  normalizeLayoutItems,
  resolveBreakpointByWidth,
  seedCollageRows,
  withEffectiveGridConfig,
} from './builder/gridEngine';
import { loadInitialTemplates, resolveCmsSeedData, resolveInitialSubgroups } from './builder/mockData';
import type {
  BuilderSnapshotV2,
  CollageSettings,
  FlexSettings,
  GalleryLayoutMode,
  GridEngineConfig,
  GridLayoutItem,
  LayoutBreakpoint,
  TemplateAsset,
  TemplateObjectFit,
  TemplateSubgroup,
} from './builder/types';
import './layoutBuilder.css';

const NARROW_THRESHOLD = 480;

function downloadJson(filename: string, data: unknown) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

interface LayoutBuilderAppProps {
  onClose?: () => void;
  initialPanelWidth?: number;
}

export default function LayoutBuilderApp({ onClose, initialPanelWidth = 610 }: LayoutBuilderAppProps) {
  const [isLoading, setIsLoading] = React.useState(true);
  const [templates, setTemplates] = React.useState<TemplateAsset[]>([]);
  const [subgroups, setSubgroups] = React.useState<TemplateSubgroup[]>([]);
  const [selectedSubgroupId, setSelectedSubgroupId] = React.useState('all');
  const [orderedTemplateIdsBySubgroup, setOrderedTemplateIdsBySubgroup] =
    React.useState<Record<string, string[]>>({});
  const [gridEngine, setGridEngine] = React.useState<GridEngineConfig>({
    version: 1,
    defaultPresetId: 'default',
    breakpoints: [],
  });
  const [activeBreakpointKey, setActiveBreakpointKey] = React.useState('bp-narrow');
  const [panelWidth, setPanelWidth] = React.useState(initialPanelWidth);
  const [panelHeight] = React.useState(800);
  const [containerPadding, setContainerPadding] = React.useState(12);
  const [itemPaddingX, setItemPaddingX] = React.useState(8);
  const [itemPaddingY, setItemPaddingY] = React.useState(8);
  const [itemBorderRadius, setItemBorderRadius] = React.useState(10);
  const [layoutName, setLayoutName] = React.useState('');
  const [editMode, setEditMode] = React.useState(true);
  const [templateScales,    setTemplateScales]    = React.useState<Record<string, number>>({});
  const [templateObjectFit, setTemplateObjectFit] = React.useState<Record<string, TemplateObjectFit>>({});
  const [templatePadding,   setTemplatePadding]   = React.useState<Record<string, number>>({});

  const handleTemplateScaleChange = React.useCallback((id: string, scale: number) => {
    setTemplateScales(prev => ({ ...prev, [id]: scale }));
  }, []);

  const handleTemplateObjectFitChange = React.useCallback((id: string, fit: TemplateObjectFit) => {
    setTemplateObjectFit(prev => ({ ...prev, [id]: fit }));
  }, []);

  const handleTemplatePaddingChange = React.useCallback((id: string, value: number | undefined) => {
    setTemplatePadding(prev => {
      const next = { ...prev };
      if (value === undefined) delete next[id];
      else next[id] = value;
      return next;
    });
  }, []);

  // ── Init ─────────────────────────────────────────────────────────────────
  React.useEffect(() => {
    (async () => {
      setIsLoading(true);
      const seed = await resolveCmsSeedData();
      const loadedTemplates = seed?.templates ?? (await loadInitialTemplates());
      const templateIds = loadedTemplates.map(t => t.id);
      const initialSubgroups = seed?.subgroups ?? resolveInitialSubgroups(templateIds);
      const initialBreakpoints = seed?.gridEngine?.breakpoints ?? [
        createDefaultBreakpoint('bp-narrow', 'Narrow', 0, templateIds),
        createDefaultBreakpoint('bp-wide', 'Wide', NARROW_THRESHOLD, templateIds),
      ];
      const initialEngine: GridEngineConfig = seed?.gridEngine ?? {
        version: 1,
        defaultPresetId: 'default',
        breakpoints: initialBreakpoints,
      };

      setTemplates(loadedTemplates);
      setSubgroups(initialSubgroups);
      setSelectedSubgroupId(initialSubgroups[0]?.id ?? 'all');
      setOrderedTemplateIdsBySubgroup(
        seed?.orderedTemplateIdsBySubgroup ??
          initialSubgroups.reduce<Record<string, string[]>>((acc, sg) => {
            acc[sg.id] = [...sg.templateIds];
            return acc;
          }, {}),
      );
      setGridEngine(initialEngine);
      setActiveBreakpointKey(initialBreakpoints[0]?.key ?? 'bp-narrow');
      setIsLoading(false);
    })();
  }, []);

  // ── Derived ──────────────────────────────────────────────────────────────
  const templatesById = React.useMemo(
    () => templates.reduce<Record<string, TemplateAsset>>((acc, t) => { acc[t.id] = t; return acc; }, {}),
    [templates],
  );

  const orderedTemplateIds = React.useMemo(
    () => orderedTemplateIdsBySubgroup[selectedSubgroupId] ?? [],
    [orderedTemplateIdsBySubgroup, selectedSubgroupId],
  );

  const activeBreakpoint = React.useMemo(
    () => gridEngine.breakpoints.find(bp => bp.key === activeBreakpointKey) ?? null,
    [gridEngine.breakpoints, activeBreakpointKey],
  );

  const effectiveGridConfig = React.useMemo(
    () =>
      activeBreakpoint
        ? withEffectiveGridConfig(activeBreakpoint, panelWidth)
        : { cols: 6, rowHeight: 100, margin: [12, 12] as [number, number] },
    [activeBreakpoint, panelWidth],
  );

  const canvasWidth = Math.max(100, panelWidth - containerPadding * 2);

  // ── Auto-switch breakpoint as slider crosses 480px ───────────────────────
  // Disabled when user manually pins a breakpoint tab
  const manualBpRef = React.useRef(false);
  React.useEffect(() => {
    if (manualBpRef.current) return;
    const resolved = resolveBreakpointByWidth(gridEngine.breakpoints, panelWidth);
    if (resolved && resolved.key !== activeBreakpointKey) {
      setActiveBreakpointKey(resolved.key);
    }
  }, [panelWidth, gridEngine.breakpoints]);

  // Resume auto-switching when slider moves after a manual pin
  const handleSliderChange = (w: number) => {
    manualBpRef.current = false;
    setPanelWidth(w);
  };

  // ── Sync layout items when subgroup or breakpoint changes ────────────────
  React.useEffect(() => {
    if (!orderedTemplateIds.length) return;
    setGridEngine(prev => {
      const bp = prev.breakpoints.find(b => b.key === activeBreakpointKey);
      if (!bp) return prev;
      const normalized = normalizeLayoutItems(bp.items, orderedTemplateIds, bp.gridConfig.cols);
      return {
        ...prev,
        breakpoints: prev.breakpoints.map(b =>
          b.key === activeBreakpointKey ? { ...b, items: normalized } : b,
        ),
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSubgroupId, activeBreakpointKey]);

  // ── Updaters ─────────────────────────────────────────────────────────────
  const updateBreakpoint = React.useCallback(
    (key: string, updater: (bp: LayoutBreakpoint) => LayoutBreakpoint) => {
      setGridEngine(prev => ({
        ...prev,
        breakpoints: prev.breakpoints.map(bp => (bp.key === key ? updater(bp) : bp)),
      }));
    },
    [],
  );

  const handleLayoutChange = React.useCallback(
    (items: GridLayoutItem[]) => {
      updateBreakpoint(activeBreakpointKey, bp => ({ ...bp, items }));
    },
    [activeBreakpointKey, updateBreakpoint],
  );

  const handleSelectSubgroup = (id: string) => setSelectedSubgroupId(id);

  const uploadInputRef = React.useRef<HTMLInputElement>(null);

  const handleUploadFiles = React.useCallback(async (files: FileList | null) => {
    if (!files?.length) return;
    const newTemplates: TemplateAsset[] = [];
    const newIds: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const size = await new Promise<{ width: number; height: number }>((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 240, height: 160 });
        img.src = dataUrl;
      });
      const id = `tpl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      newTemplates.push({
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        src: dataUrl,
        width: size.width,
        height: size.height,
      });
      newIds.push(id);
    }

    if (!newTemplates.length) return;

    setTemplates(prev => [...prev, ...newTemplates]);
    setOrderedTemplateIdsBySubgroup(prev => ({
      ...prev,
      [selectedSubgroupId]: [...(prev[selectedSubgroupId] ?? []), ...newIds],
    }));
  }, [selectedSubgroupId]);

  const handleReorder = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return;
    const ids = [...(orderedTemplateIdsBySubgroup[selectedSubgroupId] ?? [])];
    const [moved] = ids.splice(fromIndex, 1);
    if (moved === undefined) return;

    ids.splice(toIndex, 0, moved);
    setOrderedTemplateIdsBySubgroup(prev => ({ ...prev, [selectedSubgroupId]: ids }));

    if (!activeBreakpoint) return;
    const presetId = activeBreakpoint.presetId ?? 'collage-rows-3';
    const collageAutoParams = presetId === 'collage-auto' ? {
      containerWidth: canvasWidth,
      gap: activeBreakpoint.gridConfig.margin[0],
      paddingX: itemPaddingX,
      paddingY: itemPaddingY,
      settings: activeBreakpoint.collageSettings ?? { targetRowHeight: 200, minItemSize: 80, groupPattern: '' },
      templateScales,
    } : undefined;
    const rglParams = {
      containerWidth: canvasWidth,
      gap: activeBreakpoint.gridConfig.margin[0],
      rowHeight: activeBreakpoint.gridConfig.rowHeight,
    };
    const result = applyPreset(
      presetId, templates, ids,
      activeBreakpoint.gridConfig.cols,
      collageAutoParams,
      rglParams,
    );
    updateBreakpoint(activeBreakpointKey, bp => ({
      ...bp,
      items: result.items,
      galleryLayout: (result.galleryLayout ?? bp.galleryLayout) as typeof bp.galleryLayout,
    }));
  };

  const handleApplyPreset = (presetId: string) => {
    if (!activeBreakpoint) return;
    const collageAutoParams = presetId === 'collage-auto' ? {
      containerWidth: canvasWidth,
      gap: activeBreakpoint.gridConfig.margin[0],
      paddingX: itemPaddingX,
      paddingY: itemPaddingY,
      settings: activeBreakpoint.collageSettings ?? { targetRowHeight: 200, minItemSize: 80, groupPattern: '' },
      templateScales,
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
    updateBreakpoint(activeBreakpointKey, bp => ({
      ...bp,
      galleryLayout: (result.galleryLayout ?? bp.galleryLayout) as GalleryLayoutMode,
      gridConfig: {
        ...bp.gridConfig,
        ...(result.cols     ? { cols: result.cols }         : {}),
        ...(result.rowHeight ? { rowHeight: result.rowHeight } : {}),
      },
      items: result.items,
      presetId,
    }));
    // Reset per-item overrides when a fresh preset is seeded
    setTemplateScales({});
    setTemplateObjectFit({});
    setTemplatePadding({});
  };

  const handleFlexSettingsChange = React.useCallback(
    (field: keyof FlexSettings, value: number | boolean) => {
      updateBreakpoint(activeBreakpointKey, bp => ({
        ...bp,
        flexSettings: {
          minItemWidth: bp.flexSettings?.minItemWidth ?? 100,
          maxItemWidth: bp.flexSettings?.maxItemWidth ?? 240,
          itemHeight:   bp.flexSettings?.itemHeight   ?? 80,
          scrollable:   bp.flexSettings?.scrollable   ?? true,
          [field]: value,
        },
      }));
    },
    [activeBreakpointKey, updateBreakpoint],
  );

  const handleCollageSettingsChange = React.useCallback(
    (field: keyof CollageSettings, value: number | string) => {
      updateBreakpoint(activeBreakpointKey, bp => ({
        ...bp,
        collageSettings: {
          targetRowHeight: bp.collageSettings?.targetRowHeight ?? 200,
          minItemSize:     bp.collageSettings?.minItemSize     ?? 80,
          groupPattern:    bp.collageSettings?.groupPattern    ?? '',
          [field]: value,
        },
      }));
    },
    [activeBreakpointKey, updateBreakpoint],
  );

  const handleLayoutTypeChange = (type: GalleryLayoutMode) => {
    updateBreakpoint(activeBreakpointKey, bp => {
      // When switching INTO Collage, re-seed items as rows so CollageCanvas
      // gets proper row groupings rather than flat grid coordinates.
      const needsCollageReseed = type === 'Collage' && bp.galleryLayout !== 'Collage';
      const currentIds = bp.items.map(i => i.i);
      return {
        ...bp,
        galleryLayout: type,
        compactor: type === 'Collage' ? 'none' : 'vertical',
        items: needsCollageReseed ? seedCollageRows(currentIds, [3]) : bp.items,
        presetId: needsCollageReseed ? 'collage-rows-3' : bp.presetId,
        fluidity: {
          ...bp.fluidity,
          withinBreakpoint: type === 'Flex' ? 'recalculate' : 'static',
          structuralMode: type === 'Flex' ? 'autoFill' : 'fixed',
        },
      };
    });
  };

  const handleGridConfigChange = (field: 'cols' | 'rowHeight' | 'gap', value: number) => {
    updateBreakpoint(activeBreakpointKey, bp => ({
      ...bp,
      gridConfig: {
        ...bp.gridConfig,
        cols: field === 'cols' ? value : bp.gridConfig.cols,
        rowHeight: field === 'rowHeight' ? value : bp.gridConfig.rowHeight,
        margin: field === 'gap' ? [value, value] : bp.gridConfig.margin,
      },
    }));
  };

  const handleSelectBreakpoint = (key: string) => {
    manualBpRef.current = true;
    setActiveBreakpointKey(key);
  };

  // ── Save / Load ───────────────────────────────────────────────────────────
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleSave = () => {
    const snapshot: BuilderSnapshotV2 = {
      version: '2.0',
      panelWidth,
      panelHeight,
      selectedSubgroupId,
      activeBreakpointKey,
      orderedTemplateIdsBySubgroup,
      templates,
      subgroups,
      gridEngine,
    };
    downloadJson(`layout-${Date.now()}.json`, snapshot);
  };

  const handleLoadFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const snap = JSON.parse(ev.target?.result as string) as BuilderSnapshotV2;
        if (snap.version === '2.0') {
          setPanelWidth(snap.panelWidth);
          setTemplates(snap.templates);
          setSubgroups(snap.subgroups);
          setSelectedSubgroupId(snap.selectedSubgroupId);
          setOrderedTemplateIdsBySubgroup(snap.orderedTemplateIdsBySubgroup);
          setGridEngine(snap.gridEngine);
          setActiveBreakpointKey(snap.activeBreakpointKey);
        }
      } catch (err) {
        console.error('Failed to load snapshot', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return <div className="lb-loading">Loading...</div>;
  }

  return (
    <div className="lb-app">
      <header className="lb-header">
        <div className="lb-header-left">
          <h1>Add Panel Layout Builder</h1>
          <span className="lb-header-sub">Build tab inner content · Collage · Grid · Masonry · Flex</span>
        </div>
        <div className="lb-header-actions">
          {onClose && (
            <button type="button" className="lb-btn lb-btn-ghost" onClick={onClose}>
              ← Back to Editor
            </button>
          )}
          <label className="lb-btn lb-btn-ghost lb-btn-file">
            Load JSON
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleLoadFile}
            />
          </label>
          <button className="lb-btn lb-btn-primary" onClick={handleSave}>
            Save JSON
          </button>
          <label className="lb-edit-toggle">
            <input
              type="checkbox"
              checked={editMode}
              onChange={e => setEditMode(e.target.checked)}
            />
            <span>Edit mode</span>
          </label>
        </div>
      </header>

      <div className="lb-body">
        <LeftPanel
          layoutName={layoutName}
          subgroups={subgroups}
          selectedSubgroupId={selectedSubgroupId}
          orderedTemplateIds={orderedTemplateIds}
          templatesById={templatesById}
          breakpoints={gridEngine.breakpoints}
          activeBreakpointKey={activeBreakpointKey}
          activeBreakpoint={activeBreakpoint}
          containerPadding={containerPadding}
          itemPaddingX={itemPaddingX}
          itemPaddingY={itemPaddingY}
          itemBorderRadius={itemBorderRadius}
          templateScales={templateScales}
          templateObjectFit={templateObjectFit}
          templatePadding={templatePadding}
          onLayoutNameChange={setLayoutName}
          onSelectSubgroup={handleSelectSubgroup}
          onReorder={handleReorder}
          onSelectBreakpoint={handleSelectBreakpoint}
          onLayoutTypeChange={handleLayoutTypeChange}
          onApplyPreset={handleApplyPreset}
          onGridConfigChange={handleGridConfigChange}
          onContainerPaddingChange={setContainerPadding}
          onItemPaddingXChange={setItemPaddingX}
          onItemPaddingYChange={setItemPaddingY}
          onItemBorderRadiusChange={setItemBorderRadius}
          onTemplateScaleChange={handleTemplateScaleChange}
          onTemplateObjectFitChange={handleTemplateObjectFitChange}
          onTemplatePaddingChange={handleTemplatePaddingChange}
          onCollageSettingsChange={handleCollageSettingsChange}
          onFlexSettingsChange={handleFlexSettingsChange}
          onUploadTemplates={() => uploadInputRef.current?.click()}
        />
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
        <CenterStage
          panelWidth={panelWidth}
          panelHeight={panelHeight}
          canvasWidth={canvasWidth}
          containerPadding={containerPadding}
          containerBackground="#ffffff"
          containerBorderRadius={12}
          itemPaddingX={itemPaddingX}
          itemPaddingY={itemPaddingY}
          itemBorderRadius={itemBorderRadius}
          items={activeBreakpoint?.items ?? []}
          gridConfig={effectiveGridConfig}
          compactor={activeBreakpoint?.compactor ?? 'vertical'}
          editMode={editMode}
          templatesById={templatesById}
          templateScales={templateScales}
          templateObjectFit={templateObjectFit}
          templatePadding={templatePadding}
          activeBreakpointKey={activeBreakpointKey}
          breakpoints={gridEngine.breakpoints}
          onPanelWidthChange={handleSliderChange}
          onLayoutChange={handleLayoutChange}
        />
      </div>
    </div>
  );
}
