// Wix Studio-inspired dark editor tokens
export const tokens = {
  // Core palette — matches Wix Studio dark UI
  bg0: '#131315',      // deepest background (outside canvas)
  bg1: '#1A1A1C',      // primary UI background (panels, bars)
  bg2: '#242427',      // elevated surfaces (popovers, dropdowns)
  bg3: '#2E2E32',      // interactive hover states
  bg4: '#3A3A3F',      // active/selected backgrounds

  border0: 'rgba(255,255,255,0.05)',
  border1: 'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.12)',
  border3: 'rgba(255,255,255,0.18)',

  text1: '#FFFFFF',
  text2: 'rgba(255,255,255,0.72)',
  text3: 'rgba(255,255,255,0.44)',
  text4: 'rgba(255,255,255,0.28)',

  accent: '#116DFF',       // Wix blue
  accentHover: '#2A7FFF',
  accentSoft: 'rgba(17,109,255,0.12)',
  accentBorder: 'rgba(17,109,255,0.3)',

  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  dangerSoft: 'rgba(239,68,68,0.12)',

  canvasBg: '#F0F0F0',     // canvas stage background
  pageBg: '#FFFFFF',       // actual page background

  // Typography
  fontUI: "'WixMadeforText', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  fontDisplay: "'WixMadeforDisplay', 'WixMadeforText', system-ui, sans-serif",
  fontMono: "'SF Mono', 'Fira Code', 'Cascadia Code', Consolas, monospace",

  // Sizing
  topBarH: 48,
  bottomBarH: 32,
  leftRailW: 52,
  panelW: 610,        // Add panel total width (Figma: W Fixed 610px)
  panelSidebarW: 154, // Category sidebar (Figma: 142px inner + 6px padding each side)
  inspectorW: 264,

  // Radii
  r2: 2,
  r4: 4,
  r6: 6,
  r8: 8,
  r10: 10,
  r12: 12,
  rFull: 9999,

  // Shadows
  shadowPanel: '0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.25)',
  shadowSmall: '0 2px 8px rgba(0,0,0,0.3)',
  shadowCanvas: '0 0 0 1px rgba(0,0,0,0.15), 0 8px 40px rgba(0,0,0,0.3)',

  // Easing
  ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
  easeSpring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  easeSmooth: 'cubic-bezier(0.4, 0, 0.2, 1)',

  // Durations
  fast: '120ms',
  normal: '200ms',
  medium: '300ms',
};

export const panel = (extra = {}) => ({
  backgroundColor: tokens.bg1,
  borderRight: `1px solid ${tokens.border1}`,
  ...extra,
});

export const pillBtn = (active = false, extra = {}) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 5,
  height: 28,
  padding: '0 10px',
  borderRadius: tokens.rFull,
  border: 'none',
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 500,
  fontFamily: tokens.fontUI,
  transition: `background ${tokens.fast} ${tokens.ease}, color ${tokens.fast} ${tokens.ease}`,
  backgroundColor: active ? tokens.bg3 : 'transparent',
  color: active ? tokens.text1 : tokens.text2,
  ...extra,
});

export const iconBtn = (active = false, size = 32, extra = {}) => ({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: size,
  height: size,
  borderRadius: tokens.r6,
  border: 'none',
  cursor: 'pointer',
  transition: `background ${tokens.fast} ${tokens.ease}`,
  backgroundColor: active ? tokens.accentSoft : 'transparent',
  color: active ? tokens.accent : tokens.text2,
  ...extra,
});
