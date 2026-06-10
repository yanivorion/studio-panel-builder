import React, { useMemo } from 'react';

const DEFAULTS = {
  text: 'SPRITZ BERLIN   8 (AUG) 2035   DOORS OPEN 00:00',
  separator: '   ',
  backgroundColor: '#E50026',
  color: '#FFFFFF',
  fontSize: 14,
  fontWeight: 400,
  lineHeight: 16.8,
  letterSpacing: '0.04em',
  duration: 26,
  uppercase: true,
};

/**
 * Infinite horizontal ticker — Inter 14 regular, Wix event-template style.
 */
export function SectionMarquee({ config = {} }) {
  const opts = { ...DEFAULTS, ...config };
  const displayText = opts.uppercase ? opts.text.toUpperCase() : opts.text;

  const segment = useMemo(() => {
    const unit = `${displayText}${opts.separator}`;
    return unit.repeat(6);
  }, [displayText, opts.separator]);

  const trackStyle = {
    display: 'flex',
    width: 'max-content',
    animation: `ticker ${opts.duration}s linear infinite`,
    willChange: 'transform',
  };

  const textStyle = {
    flexShrink: 0,
    paddingRight: opts.separator.length ? undefined : '2rem',
    fontFamily: "'Inter', sans-serif",
    fontSize: opts.fontSize,
    fontWeight: opts.fontWeight,
    lineHeight: `${opts.lineHeight}px`,
    letterSpacing: opts.letterSpacing,
    color: opts.color,
    whiteSpace: 'nowrap',
  };

  return (
    <div
      style={{
        width: '100%',
        overflow: 'hidden',
        backgroundColor: opts.backgroundColor,
        borderBottom: '1px solid rgba(0,0,0,0.12)',
        flexShrink: 0,
      }}
    >
      <div style={trackStyle}>
        <span style={textStyle}>{segment}</span>
        <span style={textStyle} aria-hidden>{segment}</span>
      </div>
    </div>
  );
}

export function defaultMarqueeConfig(overrides = {}) {
  return { ...DEFAULTS, ...overrides };
}
