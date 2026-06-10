import React, { useState, useRef, useEffect } from 'react';
import {
  Monitor, Smartphone, Tablet, ChevronDown, Eye, Undo2, Redo2,
  Globe, Settings, Zap, Users, Share2, Star, Check
} from 'lucide-react';
import { tokens, pillBtn, iconBtn } from './tokens.js';

// ── Wix Studio logo menu (Figma: Wix 34) ────────────────────────────────────
function WixMark() {
  return (
    <button
      type="button"
      title="Wix Studio"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 52,
        height: 34,
        padding: 0,
        borderRadius: tokens.r8,
        border: 'none',
        cursor: 'pointer',
        backgroundColor: 'transparent',
        transition: `background ${tokens.fast} ${tokens.ease}`,
      }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg2; }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
    >
      <img
        src="/icons/wix-34.svg"
        alt="Wix Studio"
        width={52}
        height={34}
        draggable={false}
        style={{ display: 'block' }}
      />
    </button>
  );
}

// ── Mode pill group ──────────────────────────────────────────────────────────
const MODES = ['Design', 'Code'];

function ModePills({ mode, onChange }) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: tokens.bg2,
      borderRadius: tokens.rFull,
      padding: 2,
      gap: 0,
    }}>
      {MODES.map(m => (
        <button
          key={m}
          onClick={() => onChange(m)}
          style={{
            ...pillBtn(mode === m),
            height: 24,
            padding: '0 12px',
            fontSize: 12,
            fontWeight: mode === m ? 600 : 400,
            backgroundColor: mode === m ? tokens.bg4 : 'transparent',
            color: mode === m ? tokens.text1 : tokens.text3,
            borderRadius: tokens.rFull,
          }}
        >
          {m}
        </button>
      ))}
    </div>
  );
}

// ── Page selector ────────────────────────────────────────────────────────────
function PageSelector({ currentPage, pages, onSelect }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 8px 0 10px',
          borderRadius: tokens.r6, border: 'none',
          cursor: 'pointer', fontFamily: tokens.fontUI,
          fontSize: 13, fontWeight: 500,
          backgroundColor: open ? tokens.bg3 : 'transparent',
          color: tokens.text1,
          transition: `background ${tokens.fast} ${tokens.ease}`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = tokens.bg2; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {currentPage}
        <ChevronDown size={13} color={tokens.text3} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0,
          minWidth: 180, backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r8,
          boxShadow: tokens.shadowPanel,
          overflow: 'hidden', zIndex: 9999,
        }}>
          {pages.map(p => (
            <button
              key={p}
              onClick={() => { onSelect(p); setOpen(false); }}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', border: 'none', cursor: 'pointer',
                fontFamily: tokens.fontUI, fontSize: 13,
                backgroundColor: p === currentPage ? tokens.accentSoft : 'transparent',
                color: p === currentPage ? tokens.accent : tokens.text2,
                transition: `background ${tokens.fast} ${tokens.ease}`,
              }}
              onMouseEnter={e => { if (p !== currentPage) e.currentTarget.style.backgroundColor = tokens.bg3; }}
              onMouseLeave={e => { if (p !== currentPage) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              {p}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${tokens.border1}`, marginTop: 4 }}>
            <button
              onClick={() => setOpen(false)}
              style={{
                display: 'block', width: '100%', textAlign: 'left',
                padding: '7px 12px', border: 'none', cursor: 'pointer',
                fontFamily: tokens.fontUI, fontSize: 12,
                backgroundColor: 'transparent', color: tokens.accent,
              }}
            >
              Manage Pages
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Viewport picker ──────────────────────────────────────────────────────────
const VIEWPORTS = [
  { id: 'desktop', label: 'Desktop', icon: Monitor, width: 1280 },
  { id: 'mobile',  label: 'Mobile',  icon: Smartphone, width: 390 },
];
const COMMON_DEVICES = [
  { id: 'ipad', label: 'iPad', icon: Tablet, width: 768 },
  { id: 'ipad-pro', label: 'iPad Pro', icon: Tablet, width: 1024 },
];

function ViewportPicker({ viewport, onChangeViewport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = VIEWPORTS.find(v => v.id === viewport) || VIEWPORTS[0];
  const Icon = current.icon;

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 8px 0 10px',
          borderRadius: tokens.r6, border: 'none', cursor: 'pointer',
          fontFamily: tokens.fontUI, fontSize: 12,
          backgroundColor: open ? tokens.bg3 : 'transparent',
          color: tokens.text2,
          transition: `background ${tokens.fast} ${tokens.ease}`,
        }}
      >
        <Icon size={14} />
        <span style={{ color: tokens.text1, fontWeight: 500 }}>{current.label}</span>
        <ChevronDown size={12} color={tokens.text3} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          width: 200, backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r8,
          boxShadow: tokens.shadowPanel, overflow: 'hidden', zIndex: 9999,
          padding: '6px 0',
        }}>
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 600, color: tokens.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: tokens.fontUI }}>
            Page Breakpoints
          </div>
          {VIEWPORTS.map(v => {
            const Vi = v.icon;
            return (
              <button key={v.id} onClick={() => { onChangeViewport(v.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: tokens.fontUI, fontSize: 13,
                  backgroundColor: v.id === viewport ? tokens.accentSoft : 'transparent',
                  color: v.id === viewport ? tokens.accent : tokens.text2,
                }}
                onMouseEnter={e => { if (v.id !== viewport) e.currentTarget.style.backgroundColor = tokens.bg3; }}
                onMouseLeave={e => { if (v.id !== viewport) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Vi size={14} /> {v.label}
                {v.id === viewport && <Check size={12} style={{ marginLeft: 'auto' }} />}
              </button>
            );
          })}
          <div style={{ borderTop: `1px solid ${tokens.border1}`, margin: '6px 0' }} />
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 600, color: tokens.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: tokens.fontUI }}>
            Common Devices
          </div>
          {COMMON_DEVICES.map(v => {
            const Vi = v.icon;
            return (
              <button key={v.id} onClick={() => { onChangeViewport(v.id); setOpen(false); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  width: '100%', padding: '6px 12px', border: 'none', cursor: 'pointer',
                  fontFamily: tokens.fontUI, fontSize: 13,
                  backgroundColor: 'transparent', color: tokens.text2,
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Vi size={14} /> {v.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Zoom control ─────────────────────────────────────────────────────────────
function ZoomControl({ zoom, onZoom }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const STEPS = [50, 75, 100, 125, 150, 200];

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 4,
          height: 28, padding: '0 8px',
          borderRadius: tokens.r6, border: 'none', cursor: 'pointer',
          fontFamily: tokens.fontUI, fontSize: 12, fontWeight: 500,
          backgroundColor: open ? tokens.bg3 : 'transparent',
          color: tokens.text2,
          minWidth: 48,
        }}
      >
        {zoom}%
        <ChevronDown size={12} color={tokens.text3} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0,
          width: 140, backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r8,
          boxShadow: tokens.shadowPanel,
          padding: '6px 0', zIndex: 9999,
        }}>
          <div style={{ display: 'flex', gap: 4, padding: '0 8px 6px', borderBottom: `1px solid ${tokens.border0}` }}>
            <button onClick={() => onZoom(Math.max(25, zoom - 10))}
              style={{ flex: 1, height: 26, borderRadius: tokens.r4, border: 'none', cursor: 'pointer', backgroundColor: tokens.bg3, color: tokens.text2, fontSize: 14 }}>
              −
            </button>
            <div style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', color: tokens.text1, fontSize: 12, fontFamily: tokens.fontUI }}>
              {zoom}%
            </div>
            <button onClick={() => onZoom(Math.min(300, zoom + 10))}
              style={{ flex: 1, height: 26, borderRadius: tokens.r4, border: 'none', cursor: 'pointer', backgroundColor: tokens.bg3, color: tokens.text2, fontSize: 14 }}>
              +
            </button>
          </div>
          {STEPS.map(s => (
            <button key={s} onClick={() => { onZoom(s); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '6px 12px', border: 'none', cursor: 'pointer',
                fontFamily: tokens.fontUI, fontSize: 12,
                backgroundColor: s === zoom ? tokens.accentSoft : 'transparent',
                color: s === zoom ? tokens.accent : tokens.text2,
              }}
              onMouseEnter={e => { if (s !== zoom) e.currentTarget.style.backgroundColor = tokens.bg3; }}
              onMouseLeave={e => { if (s !== zoom) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{s}%</span>
              {s === 100 && <span style={{ fontSize: 10, color: tokens.text3 }}>Reset</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Panel preset selector ────────────────────────────────────────────────────
function PresetSelector({
  presets,
  activePresetId,
  siteDefaultPresetId,
  isPageOverride,
  onSelect,
  onSetSiteDefault,
  onDuplicatePreset,
  onCreatePreset,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const active = (presets ?? []).find(p => p.id === activePresetId);
  const isSiteDefault = activePresetId === siteDefaultPresetId && !isPageOverride;

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        title={isPageOverride ? 'Preset for this page' : 'Site default preset'}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 8px 0 10px',
          borderRadius: tokens.r6, border: 'none', cursor: 'pointer',
          fontFamily: tokens.fontUI, fontSize: 13, fontWeight: 500,
          backgroundColor: open ? tokens.bg3 : 'transparent',
          color: tokens.text1,
          transition: `background ${tokens.fast} ${tokens.ease}`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = tokens.bg2; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {active?.name ?? 'Panel'}
        {isPageOverride && (
          <span style={{ fontSize: 9, color: tokens.text3, fontWeight: 600, letterSpacing: '0.04em' }}>PAGE</span>
        )}
        {!isPageOverride && isSiteDefault && (
          <span style={{ fontSize: 9, color: tokens.text3, fontWeight: 600, letterSpacing: '0.04em' }}>SITE</span>
        )}
        <ChevronDown size={13} color={tokens.text3} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          minWidth: 200, backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r8,
          boxShadow: tokens.shadowPanel,
          overflow: 'hidden', zIndex: 9999,
        }}>
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 600, color: tokens.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: tokens.fontUI }}>
            Add Panel preset
          </div>
          {(presets ?? []).map(preset => (
            <button
              key={preset.id}
              onClick={() => { onSelect?.(preset.id); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
                fontFamily: tokens.fontUI, fontSize: 13,
                backgroundColor: preset.id === activePresetId ? tokens.accentSoft : 'transparent',
                color: preset.id === activePresetId ? tokens.accent : tokens.text2,
              }}
              onMouseEnter={e => { if (preset.id !== activePresetId) e.currentTarget.style.backgroundColor = tokens.bg3; }}
              onMouseLeave={e => { if (preset.id !== activePresetId) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span>{preset.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {preset.id === siteDefaultPresetId && (
                  <span style={{ fontSize: 9, color: tokens.text3 }}>site default</span>
                )}
                {preset.id === activePresetId && <Check size={12} />}
              </span>
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${tokens.border0}`, margin: '4px 0' }} />
          <button
            onClick={() => { onSetSiteDefault?.(activePresetId); setOpen(false); }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 12,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Set as site default
          </button>
          <button
            onClick={() => {
              const name = window.prompt('New preset name', `${active?.name ?? 'Preset'} copy`);
              if (name?.trim()) onDuplicatePreset?.(activePresetId, name.trim());
              setOpen(false);
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 12,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Duplicate preset…
          </button>
          <button
            onClick={() => {
              const name = window.prompt('New preset name', 'Custom preset');
              if (name?.trim()) onCreatePreset?.(name.trim());
              setOpen(false);
            }}
            style={{
              display: 'block', width: '100%', textAlign: 'left',
              padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 12,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            New preset…
          </button>
        </div>
      )}
    </div>
  );
}

// ── Flow selector (center bar) ───────────────────────────────────────────────
function FlowSelector({ flows, activeFlowId, onFlowChange, onAddSite, onSaveSession, onSaveJson, onImportJson }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const importRef = useRef(null);
  const active = (flows ?? []).find(f => f.id === activeFlowId);

  useEffect(() => {
    if (!open) return;
    const fn = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          height: 28, padding: '0 8px 0 10px',
          borderRadius: tokens.r6, border: 'none', cursor: 'pointer',
          fontFamily: tokens.fontUI, fontSize: 13, fontWeight: 500,
          backgroundColor: open ? tokens.bg3 : 'transparent',
          color: tokens.text1,
          transition: `background ${tokens.fast} ${tokens.ease}`,
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.backgroundColor = tokens.bg2; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.backgroundColor = 'transparent'; }}
      >
        {active?.label ?? 'Flow'}
        <ChevronDown size={13} color={tokens.text3} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          width: 220, backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r8,
          boxShadow: tokens.shadowPanel,
          padding: '6px 0', zIndex: 9999,
        }}>
          <div style={{ padding: '4px 12px 6px', fontSize: 10, fontWeight: 600, color: tokens.text3, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: tokens.fontUI }}>
            Sites
          </div>
          {(flows ?? []).map(flow => (
            <button
              key={flow.id}
              onClick={() => { onFlowChange?.(flow.id); setOpen(false); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
                fontFamily: tokens.fontUI,
                backgroundColor: flow.id === activeFlowId ? tokens.accentSoft : 'transparent',
                color: flow.id === activeFlowId ? tokens.accent : tokens.text2,
              }}
              onMouseEnter={e => { if (flow.id !== activeFlowId) e.currentTarget.style.backgroundColor = tokens.bg3; }}
              onMouseLeave={e => { if (flow.id !== activeFlowId) e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <span style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
                {flow.label}
                {flow.builtIn === false && (
                  <span style={{ fontSize: 9, color: tokens.text3, fontWeight: 600 }}>NEW</span>
                )}
              </span>
              {flow.description && (
                <span style={{ fontSize: 10, color: tokens.text3, marginTop: 1 }}>{flow.description}</span>
              )}
            </button>
          ))}
          <div style={{ borderTop: `1px solid ${tokens.border0}`, margin: '4px 0' }} />
          <button
            onClick={() => { onAddSite?.(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 13, fontWeight: 500,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            + Add site…
          </button>
          <div style={{ borderTop: `1px solid ${tokens.border0}`, margin: '4px 0' }} />
          <button
            onClick={() => { onSaveSession?.(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 13,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Save session
          </button>
          <button
            onClick={() => { onSaveJson?.(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 13,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Export JSON
          </button>
          <button
            onClick={() => { importRef.current?.click(); setOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center',
              width: '100%', padding: '7px 12px', border: 'none', cursor: 'pointer',
              fontFamily: tokens.fontUI, fontSize: 13,
              backgroundColor: 'transparent', color: tokens.accent,
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = tokens.bg3; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            Import JSON…
          </button>
          <input
            ref={importRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) onImportJson?.(file);
              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

// ── Preview button ────────────────────────────────────────────────────────────
function PreviewBtn({ onPreview }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onPreview}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: tokens.rFull, border: 'none', cursor: 'pointer',
        backgroundColor: hov ? tokens.bg3 : 'transparent',
        color: hov ? tokens.text1 : tokens.text2,
        transition: `background ${tokens.fast}`,
      }}
      title="Preview"
    >
      <Eye size={17} />
    </button>
  );
}

// ── Publish button ────────────────────────────────────────────────────────────
function PublishBtn({ published }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        height: 32, padding: '0 18px',
        borderRadius: tokens.rFull, border: 'none', cursor: 'pointer',
        fontFamily: tokens.fontUI, fontSize: 13, fontWeight: 600,
        backgroundColor: hov ? tokens.accentHover : tokens.accent,
        color: '#fff',
        transition: `background ${tokens.fast} ${tokens.ease}`,
        boxShadow: hov ? `0 0 0 3px ${tokens.accentSoft}` : 'none',
      }}
    >
      Publish
    </button>
  );
}

// ── Main TopBar ───────────────────────────────────────────────────────────────
export function TopBar({
  mode = 'Design', onModeChange,
  siteName = 'My Studio',
  flows, activeFlowId, onFlowChange, onAddSite, onSaveSession, onSaveJson, onImportJson, saveStatus,
  presets, activePresetId, siteDefaultPresetId, isPagePresetOverride,
  onPresetChange, onSetSiteDefaultPreset, onDuplicatePreset, onCreatePreset,
  currentPage = 'Home', pages = ['Home', 'About', 'Contact'],
  onPageChange,
  viewport = 'desktop', onViewportChange,
  zoom = 100, onZoom,
  onPreview,
  canUndo = false, canRedo = false, onUndo, onRedo,
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      height: tokens.topBarH,
      backgroundColor: tokens.bg1,
      borderBottom: `1px solid ${tokens.border1}`,
      padding: '0 8px',
      gap: 4,
      flexShrink: 0,
      position: 'relative',
      zIndex: 100,
    }}>
      {/* Left: Wix Studio logo menu */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <WixMark />
      </div>

      <span style={{ fontFamily: tokens.fontUI, fontSize: 13, fontWeight: 600, color: tokens.text1, padding: '0 4px' }}>
        {siteName}
      </span>

      <div style={{ width: 1, height: 20, backgroundColor: tokens.border1, margin: '0 4px' }} />

      <ModePills mode={mode} onChange={onModeChange} />

      {/* Center: flow · page · viewport */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
        {flows?.length > 0 && (
          <>
            <FlowSelector
              flows={flows}
              activeFlowId={activeFlowId}
              onFlowChange={onFlowChange}
              onAddSite={onAddSite}
              onSaveSession={onSaveSession}
              onSaveJson={onSaveJson}
              onImportJson={onImportJson}
            />
            <div style={{ width: 1, height: 16, backgroundColor: tokens.border1 }} />
          </>
        )}
        <PageSelector currentPage={currentPage} pages={pages} onSelect={onPageChange} />
        <div style={{ width: 1, height: 16, backgroundColor: tokens.border1 }} />
        <ViewportPicker viewport={viewport} onChangeViewport={onViewportChange} />
        {saveStatus && (
          <span style={{ fontSize: 10, color: tokens.text3, fontFamily: tokens.fontUI, marginLeft: 8, whiteSpace: 'nowrap' }}>
            {saveStatus}
          </span>
        )}
      </div>

      {/* Right: undo/redo · zoom · preview · divider · publish */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <button onClick={onUndo} disabled={!canUndo}
          style={{
            ...iconBtn(false, 30),
            opacity: canUndo ? 1 : 0.3,
            color: tokens.text2,
          }}
          title="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button onClick={onRedo} disabled={!canRedo}
          style={{
            ...iconBtn(false, 30),
            opacity: canRedo ? 1 : 0.3,
            color: tokens.text2,
          }}
          title="Redo"
        >
          <Redo2 size={15} />
        </button>

        <ZoomControl zoom={zoom} onZoom={onZoom} />

        <PreviewBtn onPreview={onPreview} />

        <div style={{ width: 1, height: 20, backgroundColor: tokens.border1, margin: '0 4px' }} />

        <PublishBtn />
      </div>
    </div>
  );
}
