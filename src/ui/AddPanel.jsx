import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { tokens } from './tokens.js';
import { DEFAULT_CATEGORIES, ELEMENTS_BY_CAT, APPS } from './addPanelData.js';
import { buildDefaultGroups, isBuiltinGroup, layoutKey, resolveBuiltinKind } from '../panelConfig/panelStructure.js';
import { getBuiltinTemplateIds } from '../panelConfig/builtinGroupDefaults.js';
import { getCategoryGroupConfig, isCategoryPanelGroup } from '../data/categoryPanelGroups.js';
import { isContainerLayoutGroup } from '../panelConfig/containerGroupDefaults.js';
import { resolveTemplateBadge, TemplateBadge } from '../layoutBuilder/components/TemplateBadge';
import { HERO_PRESETS } from '../data/heroPresets.js';
import './addPanel.css';

const F  = tokens.fontUI;
const FD = tokens.fontDisplay;

const DEFAULT_PANEL_GROUPS = buildDefaultGroups(DEFAULT_CATEGORIES);

/** Single composite preview PNGs — bypass flex tile cap and span full panel width */
function usesFullWidthTemplatePreview(groupId, group = null) {
  if (group?.layoutTemplateId || isContainerLayoutGroup(group)) return false;
  const config = getCategoryGroupConfig(groupId, group);
  if (config?.layoutTemplateId) return false;
  return (config?.paths?.length ?? 0) === 1;
}

/** Built-in image previews for category template groups */
function CategoryTemplatePreview({ groupId, group = null, variant = 'preview' }) {
  const config = getCategoryGroupConfig(groupId, group);
  if (!config?.paths?.length) return null;

  const isSubgroup = variant === 'subgroup';
  const multi = config.paths.length > 1;
  const spanWidth = usesFullWidthTemplatePreview(groupId, group);

  if (multi && !isSubgroup && !spanWidth) {
    return (
      <div style={{
        display: 'flex', gap: 8, overflowX: 'auto', overflowY: 'hidden',
        paddingBottom: 2, borderRadius: 8,
      }}>
        {config.paths.map(path => (
          <img
            key={path}
            src={path}
            alt=""
            draggable={false}
            style={{
              height: 88,
              width: 'auto',
              minWidth: 120,
              maxWidth: '70%',
              objectFit: 'cover',
              objectPosition: 'top left',
              borderRadius: 6,
              flexShrink: 0,
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div style={{
      width: '100%',
      display: 'flex',
      flexDirection: 'column',
      gap: isSubgroup ? 12 : 6,
    }}>
      {config.paths.map(path => (
        <img
          key={path}
          src={path}
          alt=""
          draggable={false}
          style={{
            width: '100%',
            height: 'auto',
            maxHeight: spanWidth ? undefined : (isSubgroup ? 320 : 120),
            objectFit: 'contain',
            objectPosition: 'top left',
            borderRadius: 6,
            display: 'block',
          }}
        />
      ))}
    </div>
  );
}

function renderCategoryTemplatePreview(group, previewSlot, variant = 'preview') {
  if (previewSlot) return previewSlot;
  return <CategoryTemplatePreview groupId={group.id} group={group} variant={variant} />;
}

/** Vertical gap between panel section groups */
const GROUP_SECTION_GAP = 28;
/** Default gap between containers/tiles in a group (matches builder Grid Gap default) */
const GROUP_ITEM_GAP = 12;
// ── Category sidebar ──────────────────────────────────────────────────────────
// Figma: width 154px, padding: 8px 6px 0 6px, display flex col, align-items flex-start
function CategorySidebar({ activeCategory, onSelect, panelEditMode, categories = DEFAULT_CATEGORIES }) {
  const displayCategories = categories?.length ? categories : DEFAULT_CATEGORIES;

  return (
    <div style={{
      width: tokens.panelSidebarW,   // 154px
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      padding: '8px 6px 0 6px',
      borderRight: `1px solid rgba(255,255,255,0.07)`,
      overflowY: 'auto',
      paddingBottom: 16,
    }}>
      {displayCategories.map(cat => {
        const active = cat.id === activeCategory;
        return (
          <CatItem
            key={cat.id}
            label={cat.label}
            active={active}
            onClick={() => onSelect(cat.id)}
          />
        );
      })}
    </div>
  );
}

function CatItem({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: '100%',            // fills the 142px inner width (154 - 6 - 6)
        padding: '7px 8px',
        border: 'none',
        borderRadius: 6,
        cursor: 'pointer',
        textAlign: 'left',
        fontFamily: F,
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active
          ? 'rgba(255,255,255,0.95)'
          : hov
          ? 'rgba(255,255,255,0.88)'
          : 'rgba(255,255,255,0.68)',
        backgroundColor: active
          ? 'rgba(255,255,255,0.09)'
          : hov
          ? 'rgba(255,255,255,0.05)'
          : 'transparent',
        letterSpacing: '-0.01em',
        lineHeight: 1.3,
        transition: `color 120ms, background-color 120ms`,
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}

// ── Section label row ─────────────────────────────────────────────────────────
// Content area has 16px padding, so SectionLabel uses 0 horizontal padding
function GroupMoveButtons({ groupId, index, total, onMoveGroup }) {
  if (!onMoveGroup) return null;
  return (
    <div
      style={{ display: 'flex', gap: 2, flexShrink: 0 }}
      onClick={e => e.stopPropagation()}
    >
      <button
        type="button"
        title="Move section up"
        disabled={index === 0}
        onClick={() => onMoveGroup(groupId, -1)}
        style={{
          width: 22, height: 18, padding: 0, borderRadius: 4,
          border: `1px solid ${tokens.border2}`, background: tokens.bg2,
          color: tokens.text2, fontSize: 10, cursor: index === 0 ? 'default' : 'pointer',
          opacity: index === 0 ? 0.35 : 1,
        }}
      >↑</button>
      <button
        type="button"
        title="Move section down"
        disabled={index === total - 1}
        onClick={() => onMoveGroup(groupId, 1)}
        style={{
          width: 22, height: 18, padding: 0, borderRadius: 4,
          border: `1px solid ${tokens.border2}`, background: tokens.bg2,
          color: tokens.text2, fontSize: 10, cursor: index === total - 1 ? 'default' : 'pointer',
          opacity: index === total - 1 ? 0.35 : 1,
        }}
      >↓</button>
    </div>
  );
}

function sectionLabelClassName({ editable, active, actions }) {
  return [
    'ap-section-label',
    editable && 'ap-section-label--editable',
    active && 'ap-section-label--active',
    actions && 'ap-section-label--actions',
  ].filter(Boolean).join(' ');
}

function SectionLabel({ left, right, onSeeMore, onClick, isActive, showSeeMore = true, moveButtons = null }) {
  return (
    <div
      className={sectionLabelClassName({ editable: !!onClick, active: isActive })}
      onClick={onClick}
    >
      <span className="ap-section-label__title">{left}</span>
      {moveButtons}
      {right && showSeeMore && (
        <button
          type="button"
          className="ap-section-label__see-more"
          onClick={e => { e.stopPropagation(); onSeeMore?.(); }}
        >
          {right}
        </button>
      )}
    </div>
  );
}

// ── Action cards (Upload / Generate Image / Generate Element) ─────────────────
const ACTION_CARDS = [
  { img: '/panel/icon-upload.png',      label: 'Upload\nMedia',       elementId: 'image' },
  { img: '/panel/icon-gen-image.png',   label: 'Generate\nImage',     elementId: 'image' },
  { img: '/panel/icon-gen-element.png', label: 'Generate\nElement',   elementId: 'container' },
];

function ActionCard({ img, label, elementId }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: elementId, label }));
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        flex: '1 0 0',
        display: 'flex', flexDirection: 'column',
        alignItems: 'flex-start', justifyContent: 'center',
        padding: '8px 12px 12px 12px',
        gap: 8,
        borderRadius: 10,
        border: `1px solid ${hov ? tokens.border2 : tokens.border1}`,
        backgroundColor: hov ? tokens.bg3 : tokens.bg2,
        cursor: 'pointer',
        transition: `all 120ms ease`,
        overflow: 'hidden',
      }}
    >
      <img src={img} alt="" draggable={false} style={{
        width: 52, height: 52, objectFit: 'contain',
        pointerEvents: 'none', flexShrink: 0,
      }} />
      <span style={{
        fontSize: 11, fontFamily: F, fontWeight: 500,
        color: hov ? tokens.text1 : tokens.text2,
        textAlign: 'left', lineHeight: 1.35, whiteSpace: 'pre-line',
      }}>
        {label}
      </span>
    </button>
  );
}

// ── Branded elements (live previews, Wix Madefor — Figma Type B / Item) ───────
const BRAND = '#D590FF';

const BRANDED = [
  { id: 'heading',     type: 'heading' },
  { id: 'btn-fill',    type: 'btn-fill' },
  { id: 'shape-rect',  type: 'box' },
  { id: 'shape-line',  type: 'line' },
  { id: 'btn-outline', type: 'btn-outline' },
  { id: 'paragraph',   type: 'paragraph' },
];

// Per-cell padding from Figma layer properties
const BRANDED_CELL_PAD = {
  heading:     '0 17px',
  box:         '0 17px',
  line:        '0 12px',
  'btn-fill':  '0 12px',
  'btn-outline': '0 12px',
  paragraph:   '0 12px',
};

function BrandedPreview({ type }) {
  switch (type) {
    case 'heading':
      return (
        <span style={{
          fontFamily: FD, fontWeight: 700, fontSize: 14,
          color: BRAND, lineHeight: 'normal', whiteSpace: 'nowrap',
        }}>
          Heading 2
        </span>
      );
    case 'btn-fill':
      return (
        <span style={{
          fontFamily: F, fontWeight: 600, fontSize: 14,
          color: '#fff', backgroundColor: BRAND,
          padding: '10px 24px', borderRadius: 24, lineHeight: '18px',
          display: 'inline-flex', alignItems: 'flex-start',
        }}>
          Button
        </span>
      );
    case 'box':
      return (
        <div style={{
          width: '100%', height: 24, borderRadius: 24,
          backgroundColor: BRAND, flexShrink: 0,
        }} />
      );
    case 'line':
      return (
        <div style={{
          width: '100%', height: 2, backgroundColor: BRAND,
          borderRadius: 1, flexShrink: 0,
        }} />
      );
    case 'btn-outline':
      return (
        <span style={{
          fontFamily: F, fontWeight: 600, fontSize: 14,
          color: BRAND, backgroundColor: 'transparent',
          padding: '10px 24px', borderRadius: 24, lineHeight: '18px',
          border: `1.5px solid ${BRAND}`,
          display: 'inline-flex', alignItems: 'flex-start',
        }}>
          Button
        </span>
      );
    case 'paragraph':
      return (
        <p style={{
          margin: 0, flex: '1 0 0', width: '100%',
          fontFamily: F, fontWeight: 400, fontSize: 7,
          color: BRAND, lineHeight: 'normal', textAlign: 'left',
        }}>
          I'm a paragraph. Click here to add your own text and edit me. It's easy. Just click on "Edit Text" or double click me to add your own content and make changes to the font.
        </p>
      );
    default:
      return null;
  }
}

function BuiltinBadgeOverlay({ templateId, templateBadges }) {
  if (!templateId || !templateBadges) return null;
  const settings = resolveTemplateBadge(templateId, templateBadges);
  if (!settings.enabled) return null;
  return <TemplateBadge settings={settings} />;
}

function BrandedItem({ item, onAdd, templateId, templateBadges }) {
  const [hov, setHov] = useState(false);
  const hasBadge = templateId && templateBadges?.[templateId]?.enabled;
  const label = item.type === 'heading' ? 'Heading 2'
    : item.type === 'box' ? 'Box'
    : item.type === 'line' ? 'Line'
    : item.type === 'btn-fill' || item.type === 'btn-outline' ? 'Button'
    : 'Paragraph';

  return (
    <div
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, label }));
      }}
      onClick={() => onAdd?.({ id: item.id, label })}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 72,
        minWidth: 78,
        borderRadius: 8,
        backgroundColor: '#1d1d1f',
        border: `1px solid ${hov ? tokens.border2 : tokens.border1}`,
        overflow: hasBadge ? 'visible' : 'hidden',
        cursor: 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: BRANDED_CELL_PAD[item.type] || '0 12px',
        transition: `border-color 120ms`,
        boxSizing: 'border-box',
        position: 'relative',
      }}
    >
      <BrandedPreview type={item.type} />
      <BuiltinBadgeOverlay templateId={templateId} templateBadges={templateBadges} />
    </div>
  );
}

function BrandedGrid({ onAdd, templateIds, templateBadges }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: GROUP_ITEM_GAP }}>
      {BRANDED.map((b, i) => (
        <BrandedItem
          key={b.id}
          item={b}
          onAdd={onAdd}
          templateId={templateIds?.[i]}
          templateBadges={templateBadges}
        />
      ))}
    </div>
  );
}

// ── Site files ────────────────────────────────────────────────────────────────
const SITE_PHOTOS = [
  '/panel/photo-1.png',
  '/panel/photo-2.png',
  '/panel/photo-3.png',
  '/panel/photo-4.png',
  '/panel/photo-5.png',
];

function SiteFileThumb({ src, templateId, templateBadges }) {
  const [hov, setHov] = useState(false);
  const hasBadge = templateId && templateBadges?.[templateId]?.enabled;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 78, height: 78, flexShrink: 0,
        borderRadius: 8, overflow: hasBadge ? 'visible' : 'hidden', cursor: 'pointer',
        border: `1.5px solid ${hov ? tokens.accent : 'transparent'}`,
        transition: `border-color 120ms`,
        position: 'relative',
      }}
    >
      <img src={src} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      <BuiltinBadgeOverlay templateId={templateId} templateBadges={templateBadges} />
    </div>
  );
}

function SiteFilesStrip({ templateIds, templateBadges }) {
  return (
    <div style={{ display: 'flex', gap: GROUP_ITEM_GAP, overflowX: 'auto', paddingBottom: 2 }}>
      {SITE_PHOTOS.map((src, i) => (
        <SiteFileThumb
          key={i}
          src={src}
          templateId={templateIds?.[i]}
          templateBadges={templateBadges}
        />
      ))}
    </div>
  );
}

// ── "Make your site stunning" bento grid ──────────────────────────────────────
// Exact Figma structure — nested flex rows, NOT CSS grid:
//
//  Root (flex row, gap 8):
//  ├── Left col (flex 1, flex col, gap 8):
//  │   ├── Top row   (h 90, flex row, gap 8): [Cat flex:1] [House flex:1]
//  │   └── Bottom row(h 90, flex row, gap 8): [Sub-col 153px: Ticker+Smarter] [Bow flex:1] [NewProject flex:1]
//  └── Special Offer (w hug ~141px, h 188px, p 4px, flex col, center+center)

function StickerCell({ src, bg, fit = 'contain', style: extra = {}, templateId, templateBadges }) {
  const [hov, setHov] = useState(false);
  const hasBadge = templateId && templateBadges?.[templateId]?.enabled;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 8,
        backgroundColor: bg || tokens.bg2,
        overflow: hasBadge ? 'visible' : 'hidden',
        cursor: 'pointer',
        border: `1px solid ${hov ? tokens.border2 : tokens.border1}`,
        transition: `border-color 120ms`,
        position: 'relative',
        ...extra,
      }}
    >
      <img src={src} alt="" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: fit, display: 'block' }} />
      <BuiltinBadgeOverlay templateId={templateId} templateBadges={templateBadges} />
    </div>
  );
}

function StunningGrid({ templateIds, templateBadges }) {
  const tid = (i) => templateIds?.[i];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: GROUP_ITEM_GAP }}>

      {/* ── Left: flex column ─────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: GROUP_ITEM_GAP }}>

        {/* Top row: Cat + House — 90px tall */}
        <div style={{ display: 'flex', alignItems: 'center', gap: GROUP_ITEM_GAP, height: 90 }}>
          {/* Cat — contain, sticker floats on dark bg */}
          <StickerCell
            src="/panel/sticker-cat.png" bg="#2a2a2d" fit="contain"
            style={{ flex: 1, height: '100%' }}
            templateId={tid(0)} templateBadges={templateBadges}
          />
          {/* House — COVER, b&w illustration fills the cell */}
          <StickerCell
            src="/panel/sticker-house.png" bg="#f0f0f0" fit="cover"
            style={{ flex: 1, height: '100%' }}
            templateId={tid(1)} templateBadges={templateBadges}
          />
        </div>

        {/* Bottom row: SubCol(Ticker+Smarter) + Bow + NewProject — 90px tall */}
        <div style={{ display: 'flex', alignItems: 'center', gap: GROUP_ITEM_GAP, height: 90 }}>

          {/* Sub-column 153px: Ticker (top) + Smarter Solutions (bottom) */}
          {/* Figma: flex col, justify-content center, align-items flex-start, gap 8, align-self stretch */}
          <div style={{
            width: 153, flexShrink: 0,
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'flex-start',
            gap: GROUP_ITEM_GAP, alignSelf: 'stretch',
          }}>
            {/* Ticker strip */}
            <div style={{
              flex: 1, width: '100%',
              borderRadius: 8, backgroundColor: '#f3f3f3',
              border: `1px solid rgba(0,0,0,0.1)`,
              overflow: 'hidden', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '0 10px',
                fontSize: 10, fontFamily: F, fontWeight: 500, color: '#555',
                whiteSpace: 'nowrap', animation: 'ticker 9s linear infinite',
                letterSpacing: '0.03em',
              }}>
                <span>USE</span>
                <TickerDot />
                <span>OPEN HOUSE</span>
                <TickerDot />
                <span>OPEN HO...</span>
              </div>
            </div>

            {/* Smarter Solutions — pill image */}
            <div style={{
              flex: 1, width: '100%',
              borderRadius: 24,
              backgroundColor: '#fff',
              border: `1px solid rgba(0,0,0,0.1)`,
              overflow: 'hidden', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <img src="/panel/sticker-smarter.png" alt="" draggable={false}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
          </div>

          {/* Bow — contain, dark bg */}
          <StickerCell
            src="/panel/sticker-bow.png" bg="#1d1d1f" fit="contain"
            style={{ flex: 1, height: '100%' }}
            templateId={tid(3)} templateBadges={templateBadges}
          />

          {/* New Project stamp — contain, purple bg */}
          <StickerCell
            src="/panel/sticker-newproject.png" bg="#c9a9f5" fit="contain"
            style={{ flex: 1, height: '100%' }}
            templateId={tid(4)} templateBadges={templateBadges}
          />
        </div>
      </div>

      {/* ── Special Offer: W Hug ~141px, H Fixed 188px, padding 4px ─── */}
      {/* Figma: flex col, justify-content center, align-items center, gap 12 */}
      <div style={{
        flexShrink: 0,
        height: 188,
        padding: 4,
        borderRadius: 10,
        backgroundColor: '#b78af5',
        border: `1px solid rgba(255,255,255,0.15)`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
        cursor: 'pointer',
        overflow: tid(5) && templateBadges?.[tid(5)]?.enabled ? 'visible' : 'hidden',
        position: 'relative',
      }}>
        <img src="/panel/sticker-offer.png" alt="" draggable={false}
          style={{ width: 133, height: 180, objectFit: 'contain', display: 'block' }} />
        <BuiltinBadgeOverlay templateId={tid(5)} templateBadges={templateBadges} />
      </div>
    </div>
  );
}

function TickerDot() {
  return (
    <span style={{
      width: 14, height: 14, flexShrink: 0,
      borderRadius: '50%',
      border: '1.5px solid #aaa',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 8, color: '#888',
    }}>+</span>
  );
}

function buildSavedBadgePreview(group, groupLayouts, templates) {
  if (!groupLayouts || !templates?.length) return null;
  const layout = groupLayouts[layoutKey(group.id, 'preview')];
  if (!layout?.templateBadges || !Object.keys(layout.templateBadges).length) return null;
  const templateIds = layout.orderedTemplateIds?.length
    ? layout.orderedTemplateIds
    : getBuiltinTemplateIds(group, templates);
  if (!templateIds.length) return null;
  return { templateIds, templateBadges: layout.templateBadges };
}

function renderBuiltinGroupPreview(builtin, onAddElement, layoutSlot, badgePreview) {
  if (layoutSlot) return layoutSlot;
  if (!builtin) return null;

  const templateIds = badgePreview?.templateIds;
  const templateBadges = badgePreview?.templateBadges;

  switch (builtin) {
    case 'actions':
      return (
        <div style={{ display: 'flex', gap: GROUP_ITEM_GAP }}>
          {ACTION_CARDS.map(c => <ActionCard key={c.label} img={c.img} label={c.label} elementId={c.elementId} />)}
        </div>
      );
    case 'branded':
      return <BrandedGrid onAdd={onAddElement} templateIds={templateIds} templateBadges={templateBadges} />;
    case 'site-files':
      return <SiteFilesStrip templateIds={templateIds} templateBadges={templateBadges} />;
    case 'stunning':
      return <StunningGrid templateIds={templateIds} templateBadges={templateBadges} />;
    default:
      return null;
  }
}

function CatalogPreview({ categoryId, onAddElement }) {
  const items = (ELEMENTS_BY_CAT[categoryId] || []).slice(0, 6);
  if (!items.length) {
    return (
      <div style={{ fontSize: 12, color: tokens.text3, padding: '8px 0' }}>
        No elements in this catalog yet.
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {items.map(item => (
        <ElementItem key={item.id} item={item} onAdd={onAddElement} />
      ))}
    </div>
  );
}

function CategoryGroupsContent({
  categoryId,
  groups,
  onAddElement,
  panelEditMode,
  activeGroupId,
  onSelectGroup,
  drillInGroupId,
  onSeeMore,
  onBackFromDrillIn,
  getLayoutSlot,
  onMoveGroup,
  editPreview = null,
  groupLayouts = null,
  panelTemplates = null,
}) {
  const categoryGroups = [...groups.filter(g => g.categoryId === categoryId)]
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  if (drillInGroupId) {
    const group = categoryGroups.find(g => g.id === drillInGroupId);
    const subgroupSlot = getLayoutSlot?.(drillInGroupId, 'subgroup');
    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <button
          type="button"
          onClick={onBackFromDrillIn}
          style={{
            border: 'none', background: 'none', cursor: 'pointer',
            color: tokens.accent, fontFamily: F, fontSize: 12, fontWeight: 500,
            padding: 0, marginBottom: 12,
          }}
        >
          ← Back
        </button>
        <div
          className="ap-section-label ap-section-label--drill-in"
          style={{
            fontSize: 15, fontWeight: 600, fontFamily: F,
            color: tokens.text1, marginBottom: 12,
          }}
        >
          {group?.name ?? 'Subgroup'}
        </div>
        {subgroupSlot ?? (
          isCategoryPanelGroup(group) ? (
            renderCategoryTemplatePreview(group, null, 'subgroup')
          ) : group?.kind === 'catalog' || group?.builtin == null ? (
            <ElementListContent category={categoryId} onAddElement={onAddElement} embedded />
          ) : (
            <div style={{ fontSize: 12, color: tokens.text3 }}>
              Seed a subgroup layout in the edit panel, or this group uses built-in content.
            </div>
          )
        )}
        <div style={{ height: 16 }} />
      </div>
    );
  }

  if (!categoryGroups.length) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24,
      }}>
        <div style={{ fontSize: 13, fontFamily: F, color: tokens.text3, textAlign: 'center' }}>
          No groups in this category yet.
          {panelEditMode && (
            <>
              <br />
              Add a group in the edit panel on the left.
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      {categoryGroups.map((group, groupIndex) => {
        const isActive = panelEditMode && activeGroupId === group.id;
        const previewSlot = isBuiltinGroup(group) && !panelEditMode
          ? null
          : getLayoutSlot?.(group.id, 'preview');
        const isActions = group.builtin === 'actions';
        const moveButtons = panelEditMode ? (
          <GroupMoveButtons
            groupId={group.id}
            index={groupIndex}
            total={categoryGroups.length}
            onMoveGroup={onMoveGroup}
          />
        ) : null;

        return (
          <div
            key={group.id}
            style={{
              borderRadius: isActive ? 8 : 0,
              backgroundColor: isActive ? 'rgba(17,109,255,0.06)' : 'transparent',
              margin: isActive ? '0 -8px' : 0,
              padding: isActive ? '0 8px' : 0,
              marginBottom: isActive ? 8 : GROUP_SECTION_GAP,
            }}
          >
            {isActions && panelEditMode && (
              <div className={sectionLabelClassName({ actions: true })}>
                <span className="ap-section-label__title ap-section-label__title--actions">
                  Quick actions
                </span>
                {moveButtons}
              </div>
            )}
            {!isActions && (
              <SectionLabel
                left={group.name}
                right="See More"
                isActive={isActive}
                onClick={panelEditMode ? () => onSelectGroup?.(group.id) : undefined}
                onSeeMore={() => onSeeMore?.(group.id)}
                moveButtons={moveButtons}
              />
            )}
            <div
              onClick={panelEditMode && isActions ? () => onSelectGroup?.(group.id) : undefined}
              style={{
                outline: isActive && isActions ? `1px dashed ${tokens.accentBorder}` : 'none',
                outlineOffset: 2,
                borderRadius: 6,
                marginTop: isActions && !panelEditMode ? 0 : 6,
              }}
            >
              {isBuiltinGroup(group) ? (
                renderBuiltinGroupPreview(
                  resolveBuiltinKind(group),
                  onAddElement,
                  previewSlot,
                  panelEditMode && editPreview?.groupId === group.id
                    ? editPreview
                    : buildSavedBadgePreview(group, groupLayouts, panelTemplates),
                )
              ) : group.kind === 'templates' ? (
                renderCategoryTemplatePreview(group, previewSlot)
              ) : group.kind === 'catalog' ? (
                previewSlot ?? <CatalogPreview categoryId={categoryId} onAddElement={onAddElement} />
              ) : (
                previewSlot ?? (
                  <div style={{
                    minHeight: 64, borderRadius: 8,
                    border: '1px dashed rgba(255,255,255,0.1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, color: tokens.text3,
                  }}>
                    Preview layout — seed in edit panel
                  </div>
                )
              )}
            </div>
          </div>
        );
      })}
      <div style={{ height: 16 }} />
    </div>
  );
}

// Legacy home content (used when groups prop not passed)
function HomeContent({ onAddElement, layoutSlot = null }) {
  return (
    <CategoryGroupsContent
      categoryId="home"
      groups={[
        { id: 'grp-quick-actions', name: 'Quick actions', categoryId: 'home', kind: 'builtin', builtin: 'actions' },
        { id: 'grp-branded', name: 'Branded Elements', categoryId: 'home', kind: 'builtin', builtin: 'branded' },
        { id: 'grp-site-files', name: 'Site files', categoryId: 'home', kind: 'builtin', builtin: 'site-files' },
        { id: 'grp-stunning', name: 'Make your site stunning', categoryId: 'home', kind: 'builtin', builtin: 'stunning' },
      ]}
      onAddElement={onAddElement}
      getLayoutSlot={(groupId, layer) => (groupId === 'grp-stunning' && layer === 'preview' ? layoutSlot : null)}
    />
  );
}

// ── Element list (non-home categories) ────────────────────────────────────────
const ELEMENT_ICONS = {
  heading: 'H', paragraph: 'P', richtext: 'T', 'collapsible-text': '▸', 'text-mask': 'M',
  image: '🖼', 'image-mask': '◆', 'vector-art': '◎', 'clip-art': '★',
  'btn-fill': '█', 'btn-outline': '□', 'btn-text': '→', 'btn-icon': '⊕',
  'shape-rect': '■', 'shape-circle': '●', 'shape-tri': '▲', 'shape-line': '—', 'shape-arrow': '→',
  container: '⬜', stack: '☰', grid: '⊞', repeater: '⋮', accordion: '≡', tabs: '⊣',
  'video-player': '▶', 'video-bg': '⧉', 'video-gallery': '▦',
  form: '⊡', 'input-text': '▬', 'input-email': '@', checkbox: '☑', radio: '◉', dropdown: '▾', subscribe: '✉',
  'nav-menu': '≡', 'anchor-menu': '⚓', breadcrumbs: '›',
  popup: '◻', lightbox: '⬚',
  'gallery-grid': '⊟', 'gallery-slider': '◁▷', 'gallery-masonry': '⊞', 'gallery-3d': '◈',
  'social-share': '⟲', 'social-icons': '◎', 'like-button': '♥', comments: '💬',
  'html-embed': '<>', 'wix-app': '⚙',
};

function ElementItem({ item, onAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onAdd(item)}
      draggable
      onDragStart={e => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify({ id: item.id, label: item.label }));
      }}
      style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 10px',
        borderRadius: 6,
        cursor: 'pointer',
        backgroundColor: hov ? tokens.bg3 : 'transparent',
        transition: `background 120ms`,
        userSelect: 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, flexShrink: 0,
        borderRadius: 6, backgroundColor: tokens.bg3,
        border: `1px solid ${tokens.border1}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 15, color: tokens.text3,
      }}>
        {ELEMENT_ICONS[item.id] || '◻'}
      </div>
      <div>
        <div style={{ fontSize: 12, fontFamily: F, fontWeight: 500, color: tokens.text1, letterSpacing: '-0.01em' }}>
          {item.label}
        </div>
        {item.desc && (
          <div style={{ fontSize: 11, fontFamily: F, color: tokens.text3, marginTop: 1 }}>
            {item.desc}
          </div>
        )}
      </div>
    </div>
  );
}

function ElementListContent({ category, onAddElement, embedded = false }) {
  const items = ELEMENTS_BY_CAT[category] || [];
  return (
    <div style={{ flex: embedded ? undefined : 1, overflowY: 'auto', padding: embedded ? 0 : '8px 6px' }}>
      {items.map(item => (
        <ElementItem key={item.id} item={item} onAdd={onAddElement} />
      ))}
    </div>
  );
}

// ── Sections tab ──────────────────────────────────────────────────────────────
function HeroPresetCard({ preset, onApply }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onApply(preset.id)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10,
        border: `1px solid ${hov ? tokens.accentBorder : tokens.border1}`,
        overflow: 'hidden', cursor: 'pointer',
        backgroundColor: hov ? tokens.bg3 : tokens.bg2,
        transition: 'all 120ms ease',
      }}
    >
      <div style={{
        height: 100, backgroundColor: tokens.bg0,
        borderBottom: `1px solid ${tokens.border0}`,
        overflow: 'hidden',
      }}>
        <img
          src={preset.preview}
          alt=""
          draggable={false}
          style={{
            width: '100%', height: '100%',
            objectFit: 'cover', objectPosition: 'center top',
            display: 'block',
            opacity: hov ? 1 : 0.92,
            transition: 'opacity 120ms',
          }}
        />
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: tokens.text1 }}>
          {preset.label}
        </div>
        {preset.description && (
          <div style={{ fontSize: 10, fontFamily: F, color: tokens.text3, marginTop: 3, lineHeight: 1.4 }}>
            {preset.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
          {preset.tags.map(t => (
            <span key={t} style={{
              fontSize: 9, fontFamily: F, color: tokens.text3,
              backgroundColor: tokens.bg4, borderRadius: 20,
              padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

const SECTION_PRESETS = [
  { id: 'features',     label: 'Features',       tags: ['grid', 'cards'] },
  { id: 'testimonials', label: 'Testimonials',   tags: ['quotes'] },
  { id: 'pricing',      label: 'Pricing',        tags: ['table'] },
  { id: 'cta',          label: 'Call to Action', tags: ['banner'] },
  { id: 'contact',      label: 'Contact',        tags: ['form'] },
  { id: 'gallery-sec',  label: 'Gallery',        tags: ['grid', 'media'] },
  { id: 'team',         label: 'Team',           tags: ['cards', 'people'] },
  { id: 'faq',          label: 'FAQ',            tags: ['accordion'] },
  { id: 'footer',       label: 'Footer',         tags: ['navigation'] },
];

function SectionPresetCard({ preset, onAdd }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onClick={() => onAdd(preset)}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        borderRadius: 10,
        border: `1px solid ${hov ? tokens.border2 : tokens.border1}`,
        overflow: 'hidden', cursor: 'pointer',
        backgroundColor: hov ? tokens.bg3 : tokens.bg2,
        transition: `all 120ms ease`,
      }}
    >
      <div style={{
        height: 80, backgroundColor: tokens.bg0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderBottom: `1px solid ${tokens.border0}`,
      }}>
        <div style={{
          width: '80%', height: '60%',
          backgroundImage: `linear-gradient(${tokens.border1} 1px, transparent 1px), linear-gradient(90deg, ${tokens.border1} 1px, transparent 1px)`,
          backgroundSize: '10px 10px', borderRadius: 4, opacity: 0.5,
        }} />
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, fontFamily: F, fontWeight: 600, color: tokens.text1 }}>{preset.label}</div>
        <div style={{ display: 'flex', gap: 3, marginTop: 4, flexWrap: 'wrap' }}>
          {preset.tags.map(t => (
            <span key={t} style={{
              fontSize: 9, fontFamily: F, color: tokens.text3,
              backgroundColor: tokens.bg4, borderRadius: 20,
              padding: '1px 6px', textTransform: 'uppercase', letterSpacing: '0.04em',
            }}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

function SectionsContent({ onAddSection, onApplyHeroTemplate }) {
  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
      {onApplyHeroTemplate && (
        <>
          <div style={{
            fontSize: 11, fontFamily: F, fontWeight: 600,
            color: tokens.text3, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 8,
          }}>
            Site layouts
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
            {HERO_PRESETS.map(p => (
              <HeroPresetCard key={p.id} preset={p} onApply={onApplyHeroTemplate} />
            ))}
          </div>
          <div style={{
            fontSize: 11, fontFamily: F, fontWeight: 600,
            color: tokens.text3, textTransform: 'uppercase',
            letterSpacing: '0.06em', marginBottom: 8,
          }}>
            More sections
          </div>
        </>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {SECTION_PRESETS.map(p => (
          <SectionPresetCard key={p.id} preset={p} onAdd={onAddSection} />
        ))}
      </div>
    </div>
  );
}

// ── Apps tab ──────────────────────────────────────────────────────────────────
function AppItem({ app }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        backgroundColor: hov ? tokens.bg2 : 'transparent',
        transition: `background 120ms`, cursor: 'pointer',
      }}
    >
      <div style={{
        width: 38, height: 38, flexShrink: 0,
        borderRadius: 8, backgroundColor: tokens.bg3,
        border: `1px solid ${tokens.border1}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 18,
      }}>
        {app.icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontFamily: F, fontWeight: 600, color: tokens.text1 }}>{app.label}</div>
        <div style={{ fontSize: 11, fontFamily: F, color: tokens.text3, marginTop: 2 }}>{app.desc}</div>
      </div>
      <span style={{ fontSize: 18, color: tokens.text3, lineHeight: 1 }}>›</span>
    </div>
  );
}

function AppsContent() {
  return (
    <div style={{ flex: 1, overflowY: 'auto', paddingTop: 4 }}>
      {APPS.map(app => <AppItem key={app.id} app={app} />)}
    </div>
  );
}

// ── Search results ────────────────────────────────────────────────────────────
function SearchResults({ query, onAdd }) {
  const results = useMemo(() => {
    if (!query) return [];
    const q = query.toLowerCase();
    const out = [];
    Object.entries(ELEMENTS_BY_CAT).forEach(([, items]) => {
      items.forEach(item => {
        if (item.label.toLowerCase().includes(q) || item.desc?.toLowerCase().includes(q)) {
          out.push(item);
        }
      });
    });
    return out;
  }, [query]);

  if (results.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 8, padding: 24,
      }}>
        <div style={{ fontSize: 24, opacity: 0.3 }}>🔍</div>
        <div style={{ fontSize: 13, fontFamily: F, color: tokens.text3, textAlign: 'center' }}>
          No results for "{query}"
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '8px 6px' }}>
      {results.map(item => (
        <ElementItem key={item.id} item={item} onAdd={onAdd} />
      ))}
    </div>
  );
}

// ── Main AddPanel ─────────────────────────────────────────────────────────────
// Figma: W Fixed 610px, display flex col, padding-bottom 16px
const MAIN_TABS = ['Elements', 'Sections', 'Apps'];

export function AddPanel({
  onAddElement,
  onAddSection,
  onApplyHeroTemplate,
  onClose,
  onEditPanel,
  panelEditMode = false,
  categories = DEFAULT_CATEGORIES,
  groups = null,
  contentSlot = null,
  getLayoutSlot = null,
  activeGroupId = null,
  onSelectGroup = null,
  onMoveGroup = null,
  forcedDrillInGroupId = null,
  editPreview = null,
  groupLayouts = null,
  panelTemplates = null,
  controlledTab,
  controlledCategory,
  onTabChange: onTabChangeExternal,
  onCategoryChange: onCategoryChangeExternal,
}) {
  const [internalTab, setInternalTab] = useState('Elements');
  const [internalCategory, setInternalCategory] = useState('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [drillInGroupId, setDrillInGroupId] = useState(null);

  const activeTab = controlledTab ?? internalTab;
  const activeCategory = controlledCategory ?? internalCategory;

  const setActiveTab = useCallback((tab) => {
    if (controlledTab === undefined) setInternalTab(tab);
    onTabChangeExternal?.(tab);
  }, [controlledTab, onTabChangeExternal]);

  const setActiveCategory = useCallback((cat) => {
    if (controlledCategory === undefined) setInternalCategory(cat);
    onCategoryChangeExternal?.(cat);
  }, [controlledCategory, onCategoryChangeExternal]);

  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    setSearchQuery('');
    setDrillInGroupId(null);
    if (tab === 'Elements' && controlledCategory === undefined) setInternalCategory('home');
    if (tab === 'Elements' && onCategoryChangeExternal) onCategoryChangeExternal('home');
  }, [setActiveTab, controlledCategory, onCategoryChangeExternal]);

  const handleCategorySelect = useCallback((catId) => {
    setActiveCategory(catId);
    setDrillInGroupId(null);
  }, [setActiveCategory]);

  const isSearching  = searchQuery.length > 0 && !panelEditMode;
  const showSidebar  = activeTab === 'Elements' && !isSearching;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: tokens.panelW,   // 610px
      height: '100%',
      backgroundColor: '#1e1e20',
      borderRight: `1px solid rgba(255,255,255,0.08)`,
      flexShrink: 0,
      fontFamily: F,
    }}>

      {/* ── Header ─────────────────────────────────────────────────────────────
          Figma: 578×30 content, 16px padding on each side, justify-content space-between */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        height: 46,
        borderBottom: `1px solid rgba(255,255,255,0.07)`,
        flexShrink: 0,
        gap: 8,
      }}>
        {/* Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          {MAIN_TABS.map(tab => {
            const active = tab === activeTab;
            return (
              <TabBtn key={tab} label={tab} active={active} onClick={() => handleTabChange(tab)} />
            );
          })}
        </div>

        {/* Search */}
        {activeTab !== 'Apps' && (
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', gap: 6,
            height: 28, padding: '0 10px',
            borderRadius: 6,
            backgroundColor: 'rgba(255,255,255,0.06)',
            border: `1px solid ${searchQuery ? tokens.accentBorder : 'rgba(255,255,255,0.1)'}`,
            transition: `border-color 120ms`,
          }}>
            <Search size={12} color="rgba(255,255,255,0.3)" style={{ flexShrink: 0 }} />
            <input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search all..."
              style={{
                flex: 1, border: 'none', background: 'none', outline: 'none',
                fontFamily: F, fontSize: 12, color: tokens.text1, letterSpacing: '-0.01em',
              }}
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: tokens.text3, padding: 0, display: 'flex', flexShrink: 0 }}>
                <X size={11} />
              </button>
            )}
          </div>
        )}
        {activeTab === 'Apps' && <div style={{ flex: 1 }} />}

        {panelEditMode && (
          <span style={{
            fontSize: 10, fontWeight: 600, fontFamily: F,
            color: tokens.accent, backgroundColor: tokens.accentSoft,
            padding: '3px 8px', borderRadius: 4, flexShrink: 0,
          }}>
            EDITING
          </span>
        )}

        {onEditPanel && !panelEditMode && (
          <button
            onClick={onEditPanel}
            style={{
              height: 28, padding: '0 10px', borderRadius: 6, flexShrink: 0,
              border: `1px solid ${tokens.accentBorder}`,
              backgroundColor: tokens.accentSoft, color: tokens.accent,
              fontFamily: F, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            }}
          >
            Edit Panel
          </button>
        )}

        {/* Close */}
        <CloseBtn onClick={onClose} />
      </div>

      {/* ── Body ────────────────────────────────────────────────────────────── */}
      {isSearching ? (
        <SearchResults query={searchQuery} onAdd={onAddElement} />
      ) : (
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {showSidebar && (
            <CategorySidebar
              activeCategory={activeCategory}
              onSelect={handleCategorySelect}
              panelEditMode={panelEditMode}
              categories={categories}
            />
          )}

          {activeTab === 'Elements' ? (
            <CategoryGroupsContent
              categoryId={activeCategory}
              groups={groups?.length ? groups : DEFAULT_PANEL_GROUPS}
              onAddElement={onAddElement}
              panelEditMode={panelEditMode}
              activeGroupId={activeGroupId}
              onSelectGroup={onSelectGroup}
              onMoveGroup={onMoveGroup}
              drillInGroupId={forcedDrillInGroupId ?? drillInGroupId}
              onSeeMore={setDrillInGroupId}
              onBackFromDrillIn={() => setDrillInGroupId(null)}
              getLayoutSlot={getLayoutSlot}
              editPreview={editPreview}
              groupLayouts={groupLayouts}
              panelTemplates={panelTemplates}
            />
          ) : null}
          {activeTab === 'Sections' && (
            <SectionsContent
              onAddSection={onAddSection}
              onApplyHeroTemplate={onApplyHeroTemplate}
            />
          )}
          {activeTab === 'Apps' && (
            <AppsContent />
          )}
        </div>
      )}
    </div>
  );
}

// ── Micro helpers ─────────────────────────────────────────────────────────────
function TabBtn({ label, active, onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        height: 28, padding: '0 10px',
        border: 'none', cursor: 'pointer',
        fontFamily: F, fontSize: 13,
        fontWeight: active ? 600 : 400,
        color: active ? 'rgba(255,255,255,0.95)' : hov ? 'rgba(255,255,255,0.65)' : 'rgba(255,255,255,0.4)',
        borderRadius: 6,
        backgroundColor: active ? 'rgba(255,255,255,0.09)' : hov ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: `all 120ms`,
        letterSpacing: '-0.01em',
      }}
    >
      {label}
    </button>
  );
}

function CloseBtn({ onClick }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      aria-label="Close panel"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 26, height: 26, flexShrink: 0,
        borderRadius: 6, border: 'none', cursor: 'pointer',
        backgroundColor: hov ? 'rgba(255,255,255,0.09)' : 'transparent',
        color: hov ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: `all 120ms`,
      }}
    >
      <X size={14} />
    </button>
  );
}
