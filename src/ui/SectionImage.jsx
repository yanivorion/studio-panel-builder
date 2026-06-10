import React, { useState, useEffect, useRef } from 'react';
import { getSectionImageBitmap, loadCrispSectionImage } from './sectionImageLoader.js';

/**
 * Section image — paints a fully decoded ImageBitmap to canvas before reveal.
 */
export function SectionImage({ src, alt = '', style = {}, className }) {
  const canvasRef = useRef(null);
  const fallbackRef = useRef(null);
  const [aspect, setAspect] = useState(null);
  const [visible, setVisible] = useState(false);
  const [useFallback, setUseFallback] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAspect(null);
    setVisible(false);
    setUseFallback(false);

    if (!src) return undefined;

    (async () => {
      try {
        const { cacheKey, width, height } = await loadCrispSectionImage(src);
        if (cancelled) return;

        const paint = () => {
          const bitmap = getSectionImageBitmap(cacheKey);
          const canvas = canvasRef.current;
          if (!bitmap || !canvas) return false;

          const w = width || bitmap.width || bitmap.naturalWidth;
          const h = height || bitmap.height || bitmap.naturalHeight;
          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d', { alpha: true });
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.clearRect(0, 0, w, h);
          ctx.drawImage(bitmap, 0, 0, w, h);

          setAspect(w / h);
          setVisible(true);
          return true;
        };

        if (!paint()) {
          requestAnimationFrame(() => {
            if (!cancelled) paint();
          });
        }
      } catch (err) {
        console.warn('[SectionImage] canvas decode failed, using img fallback', err);
        if (!cancelled) setUseFallback(true);
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  useEffect(() => {
    if (!useFallback || !src) return undefined;

    const img = fallbackRef.current;
    if (!img) return undefined;

    let cancelled = false;
    setVisible(false);

    const reveal = async () => {
      try {
        if (img.decode) await img.decode();
      } catch {
        /* reveal on load */
      }
      if (cancelled) return;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        setAspect(img.naturalWidth / img.naturalHeight);
      }
      setVisible(true);
    };

    if (img.complete && img.naturalWidth > 0) {
      void reveal();
    } else {
      img.onload = () => { void reveal(); };
      img.onerror = () => { if (!cancelled) setVisible(true); };
    }

    return () => { cancelled = true; };
  }, [useFallback, src]);

  const wrapperStyle = {
    width: '100%',
    aspectRatio: aspect ? `${aspect}` : undefined,
    minHeight: aspect ? undefined : 48,
    backgroundColor: visible ? 'transparent' : 'rgba(0,0,0,0.04)',
    ...style,
  };

  if (!src) {
    return <div aria-hidden style={wrapperStyle} />;
  }

  if (useFallback) {
    return (
      <div style={wrapperStyle}>
        <img
          ref={fallbackRef}
          src={src}
          alt={alt}
          draggable={false}
          decoding="sync"
          loading="eager"
          fetchPriority="high"
          className={className}
          style={{
            width: '100%',
            height: 'auto',
            display: 'block',
            pointerEvents: 'none',
            userSelect: 'none',
            opacity: visible ? 1 : 0,
          }}
        />
      </div>
    );
  }

  return (
    <div style={wrapperStyle} role="img" aria-label={alt || undefined}>
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: '100%',
          height: 'auto',
          display: 'block',
          pointerEvents: 'none',
          userSelect: 'none',
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
