import React from 'react';
import { PRESET_OPTIONS } from '../builder/gridEngine';
import type { CollageSettings, FlexSettings, GalleryLayoutMode, LayoutBreakpoint, TemplateAsset, TemplateBadgeSettings, TemplateBadgeVariant, TemplateObjectFit, TemplateSubgroup } from '../builder/types';
import { BADGE_VARIANT_OPTIONS } from '../builder/types';
import { resolveTemplateBadge, TemplateBadgePreview } from './TemplateBadge';

const FIT_OPTIONS: { value: TemplateObjectFit; label: string; title: string }[] = [
  { value: 'contain',    label: '⬜',  title: 'contain — full asset visible, letterbox if needed' },
  { value: 'cover',      label: '▪',   title: 'cover — fills container, crops edges' },
  { value: 'fill',       label: '⬛',  title: 'fill — stretches to fill (may distort)' },
  { value: 'scale-down', label: '↙',   title: 'scale-down — like contain but never upscales' },
];

interface LeftPanelProps {
  layoutName: string;
  subgroups: TemplateSubgroup[];
  selectedSubgroupId: string;
  orderedTemplateIds: string[];
  templatesById: Record<string, TemplateAsset>;
  breakpoints: LayoutBreakpoint[];
  activeBreakpointKey: string;
  activeBreakpoint: LayoutBreakpoint | null;
  containerPadding: number;
  itemPaddingX: number;
  itemPaddingY: number;
  itemBorderRadius: number;
  onLayoutNameChange: (v: string) => void;
  onSelectSubgroup: (id: string) => void;
  onReorder: (from: number, to: number) => void;
  onRemoveTemplate?: (templateId: string) => void;
  onReplaceTemplate?: (templateId: string) => void;
  templateOrderLocked?: boolean;
  onSelectBreakpoint: (key: string) => void;
  onLayoutTypeChange: (type: GalleryLayoutMode) => void;
  onApplyPreset: (id: string) => void;
  onGridConfigChange: (field: 'cols' | 'rowHeight' | 'gap', value: number) => void;
  templateScales: Record<string, number>;
  onContainerPaddingChange: (v: number) => void;
  onItemPaddingXChange: (v: number) => void;
  onItemPaddingYChange: (v: number) => void;
  onItemBorderRadiusChange: (v: number) => void;
  templateObjectFit: Record<string, TemplateObjectFit>;
  templatePadding: Record<string, number>;
  onTemplateScaleChange: (id: string, scale: number) => void;
  onTemplateObjectFitChange: (id: string, fit: TemplateObjectFit) => void;
  onTemplatePaddingChange: (id: string, value: number | undefined) => void;
  onCollageSettingsChange: (field: keyof CollageSettings, value: number | string) => void;
  onFlexSettingsChange: (field: keyof FlexSettings, value: number | boolean) => void;
  onUploadTemplates?: () => void;
  hideSubgroupSelector?: boolean;
  templateBadges?: Record<string, TemplateBadgeSettings>;
  onTemplateBadgeChange?: (templateId: string, patch: Partial<TemplateBadgeSettings>) => void;
}

const LAYOUT_TYPES: { id: GalleryLayoutMode; label: string; hint: string }[] = [
  { id: 'Collage', label: 'Collage', hint: 'Free drag + resize. Manual mosaic geometry.' },
  { id: 'Grid', label: 'Grid', hint: 'Uniform tiles, vertical compaction.' },
  { id: 'Masonry', label: 'Masonry', hint: 'Aspect-ratio heights, vertical compaction.' },
  { id: 'Flex', label: 'Flex', hint: 'Auto-fill: cols from panel width ÷ min tile width.' },
];

export const LeftPanel: React.FC<LeftPanelProps> = ({
  layoutName,
  subgroups,
  selectedSubgroupId,
  orderedTemplateIds,
  templatesById,
  breakpoints,
  activeBreakpointKey,
  activeBreakpoint,
  containerPadding,
  itemPaddingX,
  itemPaddingY,
  itemBorderRadius,
  templateScales,
  templateObjectFit,
  templatePadding,
  onLayoutNameChange,
  onSelectSubgroup,
  onReorder,
  onRemoveTemplate,
  onReplaceTemplate,
  templateOrderLocked = false,
  onSelectBreakpoint,
  onLayoutTypeChange,
  onApplyPreset,
  onGridConfigChange,
  onContainerPaddingChange,
  onItemPaddingXChange,
  onItemPaddingYChange,
  onItemBorderRadiusChange,
  onTemplateScaleChange,
  onTemplateObjectFitChange,
  onTemplatePaddingChange,
  onCollageSettingsChange,
  onFlexSettingsChange,
  onUploadTemplates,
  hideSubgroupSelector = false,
  templateBadges,
  onTemplateBadgeChange,
}) => {
  const [draggedIdx, setDraggedIdx] = React.useState<number | null>(null);
  const [expandedBadgeId, setExpandedBadgeId] = React.useState<string | null>(null);
  const [selectedPresetId, setSelectedPresetId] = React.useState('collage-rows-3');

  const currentLayout = activeBreakpoint?.galleryLayout ?? 'Collage';
  const gridConfig = activeBreakpoint?.gridConfig;

  const filteredPresets = currentLayout === 'Grid'
    ? PRESET_OPTIONS.filter(p => p.category === 'grid')
    : currentLayout === 'Masonry'
    ? PRESET_OPTIONS.filter(p => p.category === 'masonry')
    : currentLayout === 'Collage'
    ? PRESET_OPTIONS.filter(p => p.category === 'collage')
    : [];

  // Auto-select the first available preset whenever the layout type changes
  const prevLayoutRef = React.useRef(currentLayout);
  React.useEffect(() => {
    if (currentLayout !== prevLayoutRef.current) {
      prevLayoutRef.current = currentLayout;
      if (filteredPresets.length > 0) {
        setSelectedPresetId(filteredPresets[0].id);
      }
    }
  }, [currentLayout, filteredPresets]);

  return (
    <aside className="lb-left">

      {/* ── Layout Name ───────────────────────────────────────── */}
      <section className="lp-section">
        <label className="lp-field">
          <span className="lp-label">Layout name</span>
          <input
            type="text"
            className="lp-input"
            value={layoutName}
            placeholder="Untitled layout"
            onChange={e => onLayoutNameChange(e.target.value)}
          />
        </label>
      </section>

      {/* ── Subgroup ─────────────────────────────────────────── */}
      {!hideSubgroupSelector && subgroups.length > 0 && (
      <section className="lp-section">
        <div className="lp-section-title">Subgroup</div>
        <label className="lp-field">
          <span className="lp-label">Preview subgroup</span>
          <select
            className="lp-select"
            value={selectedSubgroupId}
            onChange={e => onSelectSubgroup(e.target.value)}
          >
            {subgroups.map(sg => (
              <option key={sg.id} value={sg.id}>{sg.name}</option>
            ))}
          </select>
        </label>
      </section>
      )}

      {/* ── Breakpoints ──────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-title">Breakpoint</div>
        <div className="lp-bp-tabs">
          {breakpoints.map(bp => (
            <button
              key={bp.key}
              className={`lp-bp-tab${bp.key === activeBreakpointKey ? ' active' : ''}`}
              onClick={() => onSelectBreakpoint(bp.key)}
            >
              {bp.label}
              <span className="lp-bp-minw">{bp.minWidth}px+</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Layout Type ──────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-title">Layout type</div>
        <div className="lp-layout-types">
          {LAYOUT_TYPES.map(lt => (
            <button
              key={lt.id}
              title={lt.hint}
              className={`lp-type-btn${currentLayout === lt.id ? ' active' : ''}`}
              onClick={() => onLayoutTypeChange(lt.id)}
            >
              {lt.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Preset Seed ──────────────────────────────────────── */}
      {filteredPresets.length > 0 && (
        <section className="lp-section">
          <div className="lp-section-title">Preset seed</div>
          <div className="lp-preset-row">
            <select
              className="lp-select lp-select-flex"
              value={selectedPresetId}
              onChange={e => setSelectedPresetId(e.target.value)}
            >
              {filteredPresets.map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
            <button
              className="lp-seed-btn"
              onClick={() => onApplyPreset(selectedPresetId)}
            >
              Seed →
            </button>
          </div>
          <p className="lp-hint">Seeds the active breakpoint. Drag/resize freely after.</p>
        </section>
      )}

      {/* ── Collage Config (only for Collage layout) ─────────── */}
      {currentLayout === 'Collage' && (
        <section className="lp-section">
          <div className="lp-section-title">Collage config</div>
          <p className="lp-hint" style={{ marginBottom: 6 }}>
            Target row height and min item size guide the <strong>Auto</strong> seed preset and constrain row packing.
          </p>
          <div className="lp-grid-config">
            <label className="lp-field lp-field-sm">
              <span className="lp-label">Target row h</span>
              <input
                type="number"
                className="lp-input"
                min={40}
                max={600}
                step={10}
                value={activeBreakpoint?.collageSettings?.targetRowHeight ?? 200}
                onChange={e => onCollageSettingsChange('targetRowHeight', parseInt(e.target.value) || 200)}
              />
            </label>
            <label className="lp-field lp-field-sm">
              <span className="lp-label">Min item size</span>
              <input
                type="number"
                className="lp-input"
                min={20}
                max={400}
                step={5}
                value={activeBreakpoint?.collageSettings?.minItemSize ?? 80}
                onChange={e => onCollageSettingsChange('minItemSize', parseInt(e.target.value) || 80)}
              />
            </label>
          </div>
          {/* Group pattern */}
          <label className="lp-field" style={{ marginTop: 6 }}>
            <span className="lp-label">Group pattern</span>
            <input
              type="text"
              className="lp-input"
              placeholder="e.g. 2h,2v,3l — blank = single items"
              value={activeBreakpoint?.collageSettings?.groupPattern ?? ''}
              onChange={e => onCollageSettingsChange('groupPattern', e.target.value)}
            />
          </label>
          <p className="lp-hint">
            Valid tokens: <code>1</code> · <code>2h</code> · <code>2v</code> · <code>3h</code> · <code>3l</code> · <code>3r</code>.
            Pattern repeats. Applied when you click <strong>Seed →</strong> with the <em>Auto</em> preset.
          </p>
        </section>
      )}

      {/* ── Flex Config (only for Flex layout) ───────────────── */}
      {currentLayout === 'Flex' && (() => {
        const fs = activeBreakpoint?.flexSettings;
        const minW = fs?.minItemWidth ?? 100;
        const maxW = fs?.maxItemWidth ?? 240;
        const h    = fs?.itemHeight   ?? 80;
        const scrollable = fs?.scrollable ?? true;
        return (
          <section className="lp-section">
            <div className="lp-section-title">Flex config</div>
            <div className="lp-grid-config">
              <label className="lp-field lp-field-sm">
                <span className="lp-label">Min width</span>
                <input
                  type="number"
                  className="lp-input"
                  min={40} max={600} step={10}
                  value={minW}
                  onChange={e => onFlexSettingsChange('minItemWidth', parseInt(e.target.value) || 100)}
                />
              </label>
              <label className="lp-field lp-field-sm">
                <span className="lp-label">Max width</span>
                <input
                  type="number"
                  className="lp-input"
                  min={40} max={800} step={10}
                  value={maxW}
                  onChange={e => onFlexSettingsChange('maxItemWidth', parseInt(e.target.value) || 240)}
                />
              </label>
              <label className="lp-field lp-field-sm">
                <span className="lp-label">Item height</span>
                <input
                  type="number"
                  className="lp-input"
                  min={24} max={400} step={4}
                  value={h}
                  onChange={e => onFlexSettingsChange('itemHeight', parseInt(e.target.value) || 80)}
                />
              </label>
            </div>
            <label className="lp-field" style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <input
                type="checkbox"
                checked={scrollable}
                onChange={e => onFlexSettingsChange('scrollable', e.target.checked)}
              />
              <span className="lp-label" style={{ margin: 0 }}>Horizontal scroll (no wrap)</span>
            </label>
            <p className="lp-hint">
              Items grow from <strong>min</strong> to <strong>max</strong> width filling the row.
              In scroll mode all items stay in one horizontal strip.
            </p>
          </section>
        );
      })()}

      {/* ── Grid Config ──────────────────────────────────────── */}
      {gridConfig && (
        <section className="lp-section">
          <div className="lp-section-title">Grid config</div>
          <div className="lp-grid-config">
            <label className="lp-field lp-field-sm">
              <span className="lp-label">Cols</span>
              <input
                type="number"
                className="lp-input"
                min={1}
                max={24}
                value={gridConfig.cols}
                onChange={e => onGridConfigChange('cols', parseInt(e.target.value) || 1)}
              />
            </label>
            <label className="lp-field lp-field-sm">
              <span className="lp-label">Row h</span>
              <input
                type="number"
                className="lp-input"
                min={10}
                max={400}
                value={gridConfig.rowHeight}
                onChange={e => onGridConfigChange('rowHeight', parseInt(e.target.value) || 10)}
              />
            </label>
            <label className="lp-field lp-field-sm">
              <span className="lp-label">Gap</span>
              <input
                type="number"
                className="lp-input"
                min={0}
                max={40}
                value={gridConfig.margin[0]}
                onChange={e => onGridConfigChange('gap', parseInt(e.target.value) || 0)}
              />
            </label>
          </div>
        </section>
      )}

      {/* ── Spacing ──────────────────────────────────────────── */}
      <section className="lp-section">
        <div className="lp-section-title">Spacing</div>
        <div className="lp-grid-config">
          <label className="lp-field lp-field-sm">
            <span className="lp-label">Panel pad</span>
            <input
              type="number"
              className="lp-input"
              min={0}
              max={40}
              value={containerPadding}
              onChange={e => onContainerPaddingChange(parseInt(e.target.value) || 0)}
            />
          </label>
          <label className="lp-field lp-field-sm">
            <span className="lp-label">Tile pad X</span>
            <input
              type="number"
              className="lp-input"
              min={0}
              max={32}
              value={itemPaddingX}
              onChange={e => onItemPaddingXChange(parseInt(e.target.value) || 0)}
            />
          </label>
          <label className="lp-field lp-field-sm">
            <span className="lp-label">Tile pad Y</span>
            <input
              type="number"
              className="lp-input"
              min={0}
              max={32}
              value={itemPaddingY}
              onChange={e => onItemPaddingYChange(parseInt(e.target.value) || 0)}
            />
          </label>
          <label className="lp-field lp-field-sm">
            <span className="lp-label">Radius</span>
            <input
              type="number"
              className="lp-input"
              min={0}
              max={999}
              value={itemBorderRadius}
              onChange={e => onItemBorderRadiusChange(parseInt(e.target.value) || 0)}
            />
          </label>
        </div>
      </section>

      {/* ── Template order ───────────────────────────────────── */}
      <section className="lp-section lp-section-templates">
        <div className="lp-section-title">
          Templates
          <span className="lp-count">{orderedTemplateIds.length}</span>
          {onUploadTemplates && !templateOrderLocked && (
            <button type="button" className="lp-upload-btn" onClick={onUploadTemplates}>
              + Upload
            </button>
          )}
          {orderedTemplateIds.some(id => Math.abs((templateScales[id] ?? 1) - 1) > 0.04) && (
            <button
              className="lp-scale-reset-all"
              onClick={() => orderedTemplateIds.forEach(id => onTemplateScaleChange(id, 1))}
            >
              Reset all scales
            </button>
          )}
        </div>
        <p className="lp-template-hint">
          {templateOrderLocked
            ? 'Each slot is a container — use Replace to upload your asset.'
            : 'Drag ⠿ or use ↑↓ to reorder. × removes from this group.'}
        </p>
        <div className="lp-template-list">
          {orderedTemplateIds.map((id, index) => {
            const t = templatesById[id];
            const scale = templateScales[id] ?? 1;
            const isScaled = Math.abs(scale - 1) > 0.04;
            const badge = resolveTemplateBadge(id, templateBadges);
            const badgeExpanded = expandedBadgeId === id;
            const isSlot = Boolean(t?.containerSlot);
            return (
              <div
                key={id}
                className={`lp-template-row${draggedIdx === index ? ' dragging' : ''}`}
                draggable={!templateOrderLocked}
                onDragStart={() => setDraggedIdx(index)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => {
                  if (draggedIdx !== null && draggedIdx !== index) {
                    onReorder(draggedIdx, index);
                  }
                  setDraggedIdx(null);
                }}
                onDragEnd={() => setDraggedIdx(null)}
              >
                <div className="lp-template-order">
                  {!templateOrderLocked && (
                    <>
                      <span className="lp-drag-dot" aria-hidden title="Drag to reorder">⠿</span>
                      <div className="lp-move-btns">
                        <button
                          type="button"
                          className="lp-move-btn"
                          title="Move up"
                          disabled={index === 0}
                          onClick={() => onReorder(index, index - 1)}
                        >↑</button>
                        <button
                          type="button"
                          className="lp-move-btn"
                          title="Move down"
                          disabled={index === orderedTemplateIds.length - 1}
                          onClick={() => onReorder(index, index + 1)}
                        >↓</button>
                      </div>
                    </>
                  )}
                </div>
                <img
                  className="lp-tmpl-thumb"
                  src={t?.src}
                  alt={t?.name ?? id}
                  draggable={false}
                />
                <div className="lp-tmpl-body">
                  <div className="lp-tmpl-meta-row">
                    <div className="lp-tmpl-meta">
                      <strong>{t?.name ?? id}</strong>
                      <span>{t?.width ?? 0}×{t?.height ?? 0}</span>
                    </div>
                    {onTemplateBadgeChange && (
                      <button
                        type="button"
                        className={`lp-badge-pill${badge.enabled ? ' on' : ''}`}
                        title="Toggle badge on this container"
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onClick={() => onTemplateBadgeChange(id, { enabled: !badge.enabled })}
                      >
                        Badge
                      </button>
                    )}
                    {onReplaceTemplate && isSlot && (
                      <button
                        type="button"
                        className="lp-upload-btn lp-replace-btn"
                        title="Upload asset into this container"
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onClick={() => onReplaceTemplate(id)}
                      >
                        Replace
                      </button>
                    )}
                    {onRemoveTemplate && !isSlot && (
                      <button
                        type="button"
                        className="lp-template-remove"
                        title="Remove from this layout"
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onClick={() => onRemoveTemplate(id)}
                      >
                        ×
                      </button>
                    )}
                  </div>

                  {/* Badge settings (per template container) */}
                  {onTemplateBadgeChange && badge.enabled && (
                    <div className="lp-badge-panel">
                      <input
                        type="text"
                        className="lp-badge-label-input"
                        value={badge.label}
                        placeholder="Bookings"
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onChange={e => onTemplateBadgeChange(id, { label: e.target.value })}
                      />
                      <select
                        className="lp-badge-variant-select"
                        value={badge.variant}
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onChange={e => onTemplateBadgeChange(id, { variant: e.target.value as TemplateBadgeVariant })}
                      >
                        {BADGE_VARIANT_OPTIONS.map(opt => (
                          <option key={opt.id} value={opt.id}>{opt.label}</option>
                        ))}
                      </select>
                      <label className="lp-badge-dark-toggle" title="Dark container background">
                        <input
                          type="checkbox"
                          checked={badge.darkContainer}
                          draggable={false}
                          onDragStart={e => e.stopPropagation()}
                          onChange={e => onTemplateBadgeChange(id, { darkContainer: e.target.checked })}
                        />
                        <span>Dark</span>
                      </label>
                      <button
                        type="button"
                        className="lp-badge-expand-btn"
                        title="Preview all variants"
                        onClick={() => setExpandedBadgeId(badgeExpanded ? null : id)}
                      >
                        {badgeExpanded ? '▲' : '▼'}
                      </button>
                    </div>
                  )}
                  {badge.enabled && badgeExpanded && onTemplateBadgeChange && (
                    <div className="lp-badge-expand">
                      <div className="lp-badge-grid">
                        {BADGE_VARIANT_OPTIONS.map(opt => (
                          <TemplateBadgePreview
                            key={opt.id}
                            variant={opt.id}
                            label={badge.label || 'Bookings'}
                            active={badge.variant === opt.id}
                            onClick={() => onTemplateBadgeChange(id, { variant: opt.id })}
                          />
                        ))}
                      </div>
                      <p className="lp-template-hint">
                        {BADGE_VARIANT_OPTIONS.find(o => o.id === badge.variant)?.hint}
                      </p>
                    </div>
                  )}

                  {/* Object-fit toggles + padding override */}
                  <div className="lp-fit-row">
                    {FIT_OPTIONS.map(opt => (
                      <button
                        key={opt.value}
                        title={opt.title}
                        className={`lp-fit-btn${(templateObjectFit[id] ?? 'contain') === opt.value ? ' active' : ''}`}
                        onClick={() => onTemplateObjectFitChange(id, opt.value)}
                      >
                        {opt.label}
                      </button>
                    ))}
                    <span className="lp-fit-sep" />
                    <label className="lp-pad-label" title="Per-item padding override (blank = use global)">
                      <span>pad</span>
                      <input
                        type="number"
                        className="lp-pad-input"
                        min={0} max={40} step={1}
                        placeholder="—"
                        value={templatePadding[id] ?? ''}
                        draggable={false}
                        onDragStart={e => e.stopPropagation()}
                        onChange={e => {
                          const v = e.target.value.trim();
                          onTemplatePaddingChange(id, v === '' ? undefined : Math.max(0, parseInt(v) || 0));
                        }}
                      />
                    </label>
                    {templatePadding[id] !== undefined && (
                      <button
                        className="lp-scale-reset"
                        title="Remove padding override"
                        onClick={() => onTemplatePaddingChange(id, undefined)}
                      >↺</button>
                    )}
                  </div>

                  {/* Scale slider */}
                  <div className="lp-scale-row">
                    <input
                      type="range"
                      className="lp-scale-slider"
                      min={0.2} max={3.0} step={0.05}
                      value={scale}
                      draggable={false}
                      onDragStart={e => e.stopPropagation()}
                      onChange={e => onTemplateScaleChange(id, Number(e.target.value))}
                    />
                    <span className={`lp-scale-value${isScaled ? ' lp-scale-value--active' : ''}`}>
                      ×{scale.toFixed(2)}
                    </span>
                    {isScaled && (
                      <button
                        className="lp-scale-reset"
                        title="Reset to natural size"
                        onClick={() => onTemplateScaleChange(id, 1)}
                      >↺</button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

    </aside>
  );
};
