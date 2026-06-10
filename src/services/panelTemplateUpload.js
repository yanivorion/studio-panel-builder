import { isBase44Backend } from './backend.js';
import { uploadPanelTemplateFile } from './base44Api.js';

async function dataUrlToFile(dataUrl, name = 'template') {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = blob.type?.split('/')?.[1] || 'png';
  return new File([blob], `${name}.${ext}`, { type: blob.type || 'image/png' });
}

/**
 * Upload inline data-URL templates to Base44 file storage before save.
 * Keeps images in the panel without bloating JSON.
 */
export async function ensureUploadedTemplates(templates = []) {
  if (!isBase44Backend()) return templates;

  const next = [];
  for (const t of templates) {
    if (!t?.src?.startsWith('data:')) {
      next.push(t);
      continue;
    }
    try {
      const file = await dataUrlToFile(t.src, t.name || t.id || 'template');
      const url = await uploadPanelTemplateFile(file);
      next.push({ ...t, src: url, _pendingDataUrl: undefined });
    } catch (err) {
      console.warn('[panelTemplateUpload] upload failed for', t.id, err);
      next.push(t);
    }
  }
  return next;
}
