import React from 'react';
import { tokens } from './tokens.js';

/** Figma Stage 12 — fixed browser frame; site scrolls inside like an iframe */
export const STAGE = {
  WIDTH: 1280,
  HEIGHT: 821,
  RADIUS: 19.2,
  CHROME_H: 37,
  TOP_GAP: 32,
  BOTTOM_BLEED: 160,
};

export function SiteStage({ scale = 1, pageWidth = 1280, viewportRef, children }) {
  const innerH = STAGE.HEIGHT - STAGE.CHROME_H;
  const frameH = STAGE.HEIGHT + STAGE.BOTTOM_BLEED;
  const viewH = innerH + STAGE.BOTTOM_BLEED;
  const scaledW = STAGE.WIDTH * scale;
  const scaledH = frameH * scale;

  return (
    <div
      style={{
        width: scaledW,
        height: scaledH,
        flexShrink: 0,
        position: 'relative',
      }}
    >
      <div
        style={{
          width: STAGE.WIDTH,
          height: frameH,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          position: 'absolute',
          top: 0,
          left: 0,
        }}
      >
        {/* Site content — bleeds through bottom of frame; −1px hides chrome seam */}
        <div
          style={{
            position: 'absolute',
            top: STAGE.CHROME_H - 1,
            left: 0,
            width: STAGE.WIDTH,
            height: viewH + 1,
            overflow: 'hidden',
            zIndex: 1,
          }}
        >
          <div
            ref={viewportRef}
            style={{
              width: STAGE.WIDTH,
              height: viewH,
              overflowX: 'hidden',
              overflowY: 'auto',
              backgroundColor: tokens.pageBg,
            }}
          >
            <div
              style={{
                width: pageWidth,
                minHeight: viewH,
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {children}
            </div>
          </div>
        </div>

        {/* Frame bezel — extends to bottom of bleed zone */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: STAGE.WIDTH,
            height: frameH,
            borderRadius: STAGE.RADIUS,
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.55)',
            background: 'transparent',
            pointerEvents: 'none',
            zIndex: 3,
          }}
        />

        {/* URL chrome — solid bar, no seam line above site */}
        <div
          aria-hidden
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: STAGE.WIDTH,
            height: STAGE.CHROME_H,
            background: '#1B1B1B',
            pointerEvents: 'none',
            zIndex: 4,
            overflow: 'hidden',
            borderRadius: `${STAGE.RADIUS}px ${STAGE.RADIUS}px 0 0`,
          }}
        >
          <img
            src="/icons/stage-chrome.svg"
            alt=""
            draggable={false}
            style={{
              display: 'block',
              width: '100%',
              height: STAGE.CHROME_H,
            }}
          />
        </div>
      </div>
    </div>
  );
}
