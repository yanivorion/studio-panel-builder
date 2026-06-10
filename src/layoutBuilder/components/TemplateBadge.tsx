import React from 'react';
import type { TemplateBadgeSettings, TemplateBadgeVariant } from '../builder/types';
import { DEFAULT_BADGE_SETTINGS } from '../builder/types';

const PINK = '#FF5C9F';

function DataconnectIcon({ fill = PINK, size = 13 }: { fill?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 13 13" fill="none" aria-hidden>
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M8.6915 3.07422C9.3094 3.07422 9.81496 3.57977 9.81496 4.19768C9.81496 4.81558 9.3094 5.32113 8.6915 5.32113C8.2225 5.32113 7.81904 5.02954 7.65143 4.61897H7.56256C7.17601 4.61903 6.8604 4.9317 6.8604 5.32113V7.56805C6.8604 8.41854 6.16611 9.11267 5.31565 9.1128H5.23775C5.07014 9.52337 4.66668 9.81496 4.19768 9.81496C3.57977 9.81496 3.07422 9.3094 3.07422 8.6915C3.07422 8.0736 3.57977 7.56805 4.19768 7.56805C4.66668 7.56805 5.07014 7.85964 5.23775 8.27021H5.31565C5.70076 8.27007 6.01781 7.95319 6.01781 7.56805V5.32113C6.01781 4.4636 6.71341 3.77644 7.56256 3.77638H7.65143C7.81904 3.36581 8.2225 3.07422 8.6915 3.07422ZM4.19768 8.41064C4.04039 8.41064 3.91681 8.53422 3.91681 8.6915C3.91681 8.84879 4.04039 8.97237 4.19768 8.97237C4.35496 8.97237 4.47854 8.84879 4.47854 8.6915C4.47854 8.53422 4.35496 8.41064 4.19768 8.41064ZM8.6915 3.91681C8.53422 3.91681 8.41064 4.04039 8.41064 4.19768C8.41064 4.35496 8.53422 4.47854 8.6915 4.47854C8.84879 4.47854 8.97237 4.35496 8.97237 4.19768C8.97237 4.04039 8.84879 3.91681 8.6915 3.91681Z"
        fill={fill}
      />
    </svg>
  );
}

function IconSquare({ whiteIcon = true, size = 13 }: { whiteIcon?: boolean; size?: number }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 2,
        backgroundColor: PINK,
        flexShrink: 0,
      }}
    >
      <DataconnectIcon fill={whiteIcon ? '#fff' : PINK} size={size} />
    </span>
  );
}

const labelStyle: React.CSSProperties = {
  fontFamily: "'Wix Madefor Text', -apple-system, sans-serif",
  fontSize: 11,
  fontWeight: 500,
  color: PINK,
  lineHeight: 1,
  letterSpacing: '-0.01em',
};

const pillStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  backgroundColor: PINK,
  borderRadius: 4,
  padding: '2px 6px',
  fontFamily: "'Wix Madefor Text', -apple-system, sans-serif",
  fontSize: 10,
  fontWeight: 600,
  color: '#fff',
  lineHeight: 1.2,
  letterSpacing: '-0.01em',
};

function BadgeContent({ variant, label }: { variant: TemplateBadgeVariant; label: string }) {
  switch (variant) {
    case 'pill':
      return <span style={pillStyle}>{label}</span>;

    case 'text-icon':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <span style={labelStyle}>{label}</span>
          <IconSquare />
        </span>
      );

    case 'icon-text':
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <IconSquare />
          <span style={labelStyle}>{label}</span>
        </span>
      );

    case 'text-only':
      return <span style={labelStyle}>{label}</span>;

    case 'icon-corner':
      return <DataconnectIcon />;

    case 'pill-icon-split':
      return <span style={{ ...pillStyle, position: 'absolute', top: 6, left: 6 }}>{label}</span>;

    case 'text-icon-split':
      return <span style={{ ...labelStyle, position: 'absolute', top: 6, left: 6 }}>{label}</span>;

    default:
      return null;
  }
}

export function resolveTemplateBadge(
  templateId: string,
  templateBadges?: Record<string, TemplateBadgeSettings> | null,
): TemplateBadgeSettings {
  return templateBadges?.[templateId] ?? DEFAULT_BADGE_SETTINGS;
}

export function getTemplateTileBackground(settings?: TemplateBadgeSettings | null): string {
  if (settings?.enabled && settings.darkContainer) return '#2B2B2B';
  return '#f8f6f6';
}

interface TemplateBadgeProps {
  settings: TemplateBadgeSettings;
}

export function TemplateBadge({ settings }: TemplateBadgeProps) {
  if (!settings.enabled) return null;

  const isCornerOnly = settings.variant === 'icon-corner';
  const isSplit = settings.variant === 'pill-icon-split' || settings.variant === 'text-icon-split';

  if (isSplit) {
    return (
      <div className="template-badge" style={{ position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none' }}>
        <BadgeContent variant={settings.variant} label={settings.label} />
        <span style={{ position: 'absolute', top: 6, right: 6 }}>
          <DataconnectIcon />
        </span>
      </div>
    );
  }

  return (
    <div
      className="template-badge"
      style={{
        position: 'absolute',
        top: 6,
        left: isCornerOnly ? undefined : 6,
        right: isCornerOnly ? 6 : undefined,
        zIndex: 2,
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'flex-start',
      }}
    >
      <BadgeContent variant={settings.variant} label={settings.label} />
    </div>
  );
}

/** Mini preview for the left-panel variant picker */
export function TemplateBadgePreview({
  variant,
  label,
  active,
  onClick,
}: {
  variant: TemplateBadgeVariant;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const settings: TemplateBadgeSettings = {
    enabled: true,
    variant,
    label,
    darkContainer: true,
  };

  const caption = variant.replace(/-/g, ' ');

  return (
    <button
      type="button"
      className={`lp-badge-preview${active ? ' active' : ''}`}
      onClick={onClick}
      title={variant}
    >
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 52,
          borderRadius: 6,
          background: '#2B2B2B',
          overflow: 'hidden',
        }}
      >
        <TemplateBadge settings={settings} />
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -30%)',
            width: '55%',
            height: 14,
            borderRadius: 20,
            background: '#b78af5',
          }}
        />
      </div>
      <span className="lp-badge-preview-label">{caption}</span>
    </button>
  );
}
