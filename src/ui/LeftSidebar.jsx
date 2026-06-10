import React, { useState } from 'react';
import { tokens } from './tokens.js';

const RAIL = '/rail';

// ── Sidebar icon button (asset-based) ─────────────────────────────────────────
function SideIcon({ src, label, active, onClick, size = 30, noBg = false }) {
  const [hov, setHov] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={onClick}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        title={label}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 44,
          height: 44,
          borderRadius: tokens.r8,
          border: 'none',
          cursor: 'pointer',
          backgroundColor: noBg ? 'transparent' : (active ? tokens.accentSoft : hov ? tokens.bg2 : 'transparent'),
          transition: `background ${tokens.fast} ${tokens.ease}`,
          padding: 0,
        }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          style={{
            width: size,
            height: size,
            display: 'block',
            pointerEvents: 'none',
            opacity: active ? 1 : hov ? 0.95 : 0.72,
            transition: `opacity ${tokens.fast} ${tokens.ease}`,
          }}
        />
      </button>

      {active && (
        <div style={{
          position: 'absolute',
          left: 0,
          top: '50%',
          transform: 'translateY(-50%)',
          width: 3,
          height: 22,
          backgroundColor: tokens.accent,
          borderRadius: '0 3px 3px 0',
        }} />
      )}

      {hov && !active && (
        <div style={{
          position: 'absolute',
          left: 'calc(100% + 8px)',
          top: '50%',
          transform: 'translateY(-50%)',
          backgroundColor: tokens.bg2,
          border: `1px solid ${tokens.border1}`,
          borderRadius: tokens.r6,
          padding: '5px 9px',
          fontSize: 11,
          fontFamily: tokens.fontUI,
          color: tokens.text2,
          whiteSpace: 'nowrap',
          boxShadow: tokens.shadowSmall,
          pointerEvents: 'none',
          zIndex: 999,
        }}>
          {label}
        </div>
      )}
    </div>
  );
}

// ── Main LeftSidebar ──────────────────────────────────────────────────────────
export function LeftSidebar({
  activeTool = 'select',
  activePanel = null,
  onToolChange,
  onPanelToggle,
  onAddPanelToggle,
}) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      width: tokens.leftRailW,
      backgroundColor: tokens.bg1,
      borderRight: `1px solid ${tokens.border1}`,
      flexShrink: 0,
      paddingTop: 12,
      paddingBottom: 14,
      alignItems: 'center',
      zIndex: 50,
    }}>
      {/* Studio avatar */}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <img
          src={`${RAIL}/avatar.svg`}
          alt="Studio"
          draggable={false}
          style={{ width: 29, height: 29, display: 'block' }}
        />
      </div>

      {/* Top tools */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
        <SideIcon
          src={`${RAIL}/add.svg`}
          label="Add Elements"
          active={activePanel === 'add'}
          onClick={() => (onAddPanelToggle ?? (() => onPanelToggle('add')))()}
          size={30}
          noBg
        />
        <SideIcon
          src={`${RAIL}/select.svg`}
          label="Select"
          active={activeTool === 'select' && activePanel === null}
          onClick={() => { onToolChange('select'); onPanelToggle(null); }}
        />
      </div>

      <div style={{ flex: 1, minHeight: 24 }} />

      {/* Bottom tools — grouped with even spacing */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
      }}>
      <SideIcon
        src={`${RAIL}/design.svg`}
        label="Layout Builder"
        active={activePanel === 'design'}
        onClick={() => onPanelToggle('design')}
      />
        <SideIcon
          src={`${RAIL}/layers.svg`}
          label="Layers"
          active={activePanel === 'structure'}
          onClick={() => onPanelToggle('structure')}
        />
        <SideIcon
          src={`${RAIL}/apps.svg`}
          label="Apps"
          active={activePanel === 'apps'}
          onClick={() => onPanelToggle('apps')}
        />
        <SideIcon
          src={`${RAIL}/account.svg`}
          label="Account"
          active={false}
          onClick={() => {}}
        />
        <SideIcon
          src={`${RAIL}/help.svg`}
          label="Help"
          active={false}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
