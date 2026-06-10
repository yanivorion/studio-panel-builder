import React, { useState } from 'react';
import {
  Home, FileText, ChevronDown, ChevronRight, Plus, Eye, EyeOff,
  Lock, Unlock, Layers, Globe, X, MoreHorizontal
} from 'lucide-react';
import { tokens } from './tokens.js';

// ── Shared ────────────────────────────────────────────────────────────────────
function PanelTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        height: 36, padding: '0 10px',
        border: 'none', cursor: 'pointer', background: 'none',
        fontFamily: tokens.fontUI, fontSize: 12,
        color: active ? tokens.text1 : tokens.text3,
        fontWeight: active ? 600 : 400,
        borderBottom: active ? `2px solid ${tokens.accent}` : '2px solid transparent',
        transition: `all ${tokens.fast} ${tokens.ease}`,
      }}
    >
      {label}
    </button>
  );
}

// ── Pages panel ───────────────────────────────────────────────────────────────
function PageItem({ page, currentPage, onNavigate }) {
  const [hov, setHov] = useState(false);
  const active = page.id === currentPage;
  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={() => onNavigate(page.id)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '6px 12px', cursor: 'pointer',
        backgroundColor: active ? tokens.accentSoft : hov ? tokens.bg2 : 'transparent',
        transition: `background ${tokens.fast}`,
        borderRadius: tokens.r4,
        margin: '0 6px',
      }}
    >
      <FileText size={13} color={active ? tokens.accent : tokens.text3} />
      <span style={{ flex: 1, fontSize: 12, fontFamily: tokens.fontUI, color: active ? tokens.accent : tokens.text2, fontWeight: active ? 600 : 400 }}>
        {page.name}
      </span>
      {page.isHome && <Home size={11} color={tokens.text3} />}
      {hov && (
        <button style={{ width: 20, height: 20, border: 'none', background: 'none', color: tokens.text3, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <MoreHorizontal size={12} />
        </button>
      )}
    </div>
  );
}

function PageGroup({ label, pages, currentPage, onNavigate }) {
  const [open, setOpen] = useState(true);
  const Chevron = open ? ChevronDown : ChevronRight;
  return (
    <div>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          width: '100%', height: 28, padding: '0 12px',
          border: 'none', cursor: 'pointer', background: 'none',
          fontFamily: tokens.fontUI, fontSize: 10, fontWeight: 700,
          color: tokens.text3, textTransform: 'uppercase', letterSpacing: '0.06em',
        }}
      >
        <Chevron size={11} />
        {label}
        <span style={{ marginLeft: 4, color: tokens.text4 }}>({pages.length})</span>
      </button>
      {open && pages.map(p => (
        <PageItem key={p.id} page={p} currentPage={currentPage} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function PagesPanel({ pages = [], sections = [], currentPage, onNavigate }) {
  const mainPages = pages.filter(p => !p.group || p.group === 'main');
  const storePages = pages.filter(p => p.group === 'store');
  const memberPages = pages.filter(p => p.group === 'member');

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {mainPages.length > 0 && (
        <PageGroup label="Main Pages" pages={mainPages} currentPage={currentPage} onNavigate={onNavigate} />
      )}
      {storePages.length > 0 && (
        <PageGroup label="Store Pages" pages={storePages} currentPage={currentPage} onNavigate={onNavigate} />
      )}
      {memberPages.length > 0 && (
        <PageGroup label="Members Area" pages={memberPages} currentPage={currentPage} onNavigate={onNavigate} />
      )}
      <div style={{ padding: '8px 12px' }}>
        <button style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          width: '100%', height: 32, borderRadius: tokens.r6,
          border: `1px dashed ${tokens.border2}`, cursor: 'pointer', background: 'none',
          fontFamily: tokens.fontUI, fontSize: 12, color: tokens.accent,
        }}>
          <Plus size={13} /> Add Page
        </button>
      </div>
    </div>
  );
}

// ── Layers panel ──────────────────────────────────────────────────────────────
function LayerRow({ item, depth = 0, selectedElementId, selectedSectionId, onSelectElement, onSelectSection }) {
  const [hov, setHov] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const active = item.isSection
    ? item.id === selectedSectionId && !selectedElementId
    : item.id === selectedElementId;
  const hasChildren = item.children && item.children.length > 0;
  const Chevron = expanded ? ChevronDown : ChevronRight;

  return (
    <div>
      <div
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        onClick={() => (item.isSection ? onSelectSection?.(item.id) : onSelectElement(item.id))}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: `5px 8px 5px ${12 + depth * 14}px`,
          cursor: 'pointer',
          backgroundColor: active ? tokens.accentSoft : hov ? tokens.bg2 : 'transparent',
          transition: `background ${tokens.fast}`,
          borderRadius: tokens.r4,
          margin: '0 4px',
        }}
      >
        {hasChildren ? (
          <button onClick={e => { e.stopPropagation(); setExpanded(v => !v); }}
            style={{ width: 14, height: 14, border: 'none', background: 'none', padding: 0, cursor: 'pointer', color: tokens.text3, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Chevron size={11} />
          </button>
        ) : (
          <div style={{ width: 14, flexShrink: 0 }} />
        )}

        <span style={{
          flex: 1, fontSize: 11, fontFamily: tokens.fontUI,
          color: active ? tokens.accent : tokens.text2, fontWeight: active ? 600 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {item.label || item.type}
        </span>

        {hov && (
          <div style={{ display: 'flex', gap: 2 }}>
            <button style={{ width: 18, height: 18, border: 'none', background: 'none', color: tokens.text3, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Eye size={11} />
            </button>
            <button style={{ width: 18, height: 18, border: 'none', background: 'none', color: tokens.text3, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Unlock size={11} />
            </button>
          </div>
        )}
      </div>

      {hasChildren && expanded && item.children.map(child => (
        <LayerRow
          key={child.id}
          item={child}
          depth={depth + 1}
          selectedElementId={selectedElementId}
          selectedSectionId={selectedSectionId}
          onSelectElement={onSelectElement}
          onSelectSection={onSelectSection}
        />
      ))}
    </div>
  );
}

function LayersPanel({ sections = [], elements = [], selectedElementId, selectedSectionId, onSelectElement, onSelectSection }) {
  const tree = [
    { id: 'header', type: 'Header', label: 'Header' },
    ...sections.map(s => ({
      id: s.id,
      type: 'Section',
      label: s.label || 'Section',
      isSection: true,
      children: elements
        .filter(el => el.sectionId === s.id)
        .map(el => ({ id: el.id, type: el.type, label: el.type })),
    })),
    { id: 'footer', type: 'Footer', label: 'Footer' },
  ];

  return (
    <div style={{ overflowY: 'auto', flex: 1, paddingTop: 6, paddingBottom: 6 }}>
      {tree.map(item => (
        <LayerRow
          key={item.id}
          item={item}
          selectedElementId={selectedElementId}
          selectedSectionId={selectedSectionId}
          onSelectElement={onSelectElement}
          onSelectSection={onSelectSection}
        />
      ))}
    </div>
  );
}

// ── Global panel ─────────────────────────────────────────────────────────────
function GlobalPanel({ globalSections = [] }) {
  const GROUPS = [
    { label: 'Headers', items: globalSections.filter(s => s.type === 'header') || [{ id: 'hd', label: 'Header Default', active: true }] },
    { label: 'Sections', items: globalSections.filter(s => s.type === 'section') || [] },
    { label: 'Footers', items: globalSections.filter(s => s.type === 'footer') || [{ id: 'ft', label: 'Footer Default', active: true }] },
  ];

  return (
    <div style={{ overflowY: 'auto', flex: 1 }}>
      {GROUPS.map(group => (
        <div key={group.label} style={{ marginBottom: 6 }}>
          <div style={{ padding: '8px 12px 4px', fontSize: 10, fontWeight: 700, fontFamily: tokens.fontUI, color: tokens.text3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {group.label}
          </div>
          {group.items.map(item => (
            <div key={item.id} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 12px', margin: '0 6px', borderRadius: tokens.r4,
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = tokens.bg2}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <span style={{ flex: 1, fontSize: 12, fontFamily: tokens.fontUI, color: tokens.text2 }}>{item.label}</span>
              {item.active && <span style={{ fontSize: 10, color: tokens.accent }}>✓</span>}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

// ── Main SiteStructure ────────────────────────────────────────────────────────
export function SiteStructure({
  activeTab = 'Pages',
  onTabChange,
  pages,
  sections,
  elements,
  currentPage,
  onNavigatePage,
  selectedElementId,
  selectedSectionId,
  onSelectElement,
  onSelectSection,
  onClose,
}) {
  const TABS = ['Pages', 'Layers', 'Global'];

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      width: tokens.panelW,
      height: '100%',
      backgroundColor: tokens.bg1,
      borderRight: `1px solid ${tokens.border1}`,
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 8px 0 12px',
        borderBottom: `1px solid ${tokens.border0}`,
        height: 40, flexShrink: 0,
      }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {TABS.map(tab => (
            <PanelTab key={tab} label={tab} active={tab === activeTab} onClick={() => onTabChange(tab)} />
          ))}
        </div>
        <button onClick={onClose}
          style={{ width: 26, height: 26, borderRadius: tokens.r4, border: 'none', cursor: 'pointer', background: 'none', color: tokens.text3, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg2; e.currentTarget.style.color = tokens.text1; }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = tokens.text3; }}
        >
          <X size={13} />
        </button>
      </div>

      {/* Content */}
      {activeTab === 'Pages' && (
        <PagesPanel pages={pages} sections={sections} currentPage={currentPage} onNavigate={onNavigatePage} />
      )}
      {activeTab === 'Layers' && (
        <LayersPanel
          sections={sections}
          elements={elements}
          selectedElementId={selectedElementId}
          selectedSectionId={selectedSectionId}
          onSelectElement={onSelectElement}
          onSelectSection={onSelectSection}
        />
      )}
      {activeTab === 'Global' && (
        <GlobalPanel />
      )}
    </div>
  );
}
