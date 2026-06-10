const bitmapCache = new Map();
const pendingLoads = new Map();

export function resolveSectionImageUrl(src) {
  if (!src || src.startsWith('data:') || src.startsWith('blob:')) return src;
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  const sep = src.includes('?') ? '&' : '?';
  return `${src}${sep}v=7`;
}

function cacheKeyFor(src) {
  if (!src) return '';
  if (src.startsWith('data:') || src.startsWith('blob:')) return src;
  return resolveSectionImageUrl(src);
}

async function blobFromSrc(src) {
  if (src.startsWith('data:') || src.startsWith('blob:')) {
    const res = await fetch(src);
    return res.blob();
  }

  const url = resolveSectionImageUrl(src);
  const res = await fetch(url, { cache: 'default' });
  if (!res.ok) throw new Error(`Failed to load section image (${res.status})`);
  return res.blob();
}

async function decodeBlobToBitmap(blob) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(blob);
  }

  const objectUrl = URL.createObjectURL(blob);
  try {
    const dims = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, img });
      img.onerror = () => reject(new Error('Image decode failed'));
      img.src = objectUrl;
    });
    return dims.img;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/**
 * Fetch, fully decode via createImageBitmap, and cache the bitmap for canvas paint.
 */
export async function loadCrispSectionImage(src) {
  if (!src) return { cacheKey: '', width: 0, height: 0, ready: false };

  const cacheKey = cacheKeyFor(src);
  const cached = bitmapCache.get(cacheKey);
  if (cached) {
    return { cacheKey, width: cached.width, height: cached.height, ready: true };
  }

  if (pendingLoads.has(cacheKey)) {
    return pendingLoads.get(cacheKey);
  }

  const loadPromise = (async () => {
    const blob = await blobFromSrc(src);
    const bitmap = await decodeBlobToBitmap(blob);
    bitmapCache.set(cacheKey, bitmap);
    return {
      cacheKey,
      width: bitmap.width ?? bitmap.naturalWidth,
      height: bitmap.height ?? bitmap.naturalHeight,
      ready: true,
    };
  })();

  pendingLoads.set(cacheKey, loadPromise);
  try {
    return await loadPromise;
  } finally {
    pendingLoads.delete(cacheKey);
  }
}

export function getSectionImageBitmap(cacheKey) {
  return bitmapCache.get(cacheKey) ?? null;
}

/** Warm the decode cache for all section images on a page */
export async function preloadSectionImages(sections = []) {
  const paths = sections
    .map(s => s?.image || s?.backgroundImage)
    .filter(Boolean);

  await Promise.all(
    paths.map(src => loadCrispSectionImage(src).catch(err => {
      console.warn('[sectionImage] preload failed', src, err);
    })),
  );
}
