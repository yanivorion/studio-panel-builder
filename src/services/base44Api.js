import { base44 } from '../api/base44Client.js';
import { isBase44Backend } from './backend.js';

export const API_TIMEOUT_MS = 12_000;

export function withTimeout(promise, ms, label = 'Request') {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export async function isBase44Authenticated() {
  if (!isBase44Backend()) return true;
  try {
    return await withTimeout(base44.auth.isAuthenticated(), 5000, 'Auth check');
  } catch {
    return false;
  }
}

/** Optional — used only for diagnostics, never blocks the editor */
export async function getBase44User() {
  if (!isBase44Backend()) return null;
  try {
    return await withTimeout(base44.auth.me(), 5000, 'Auth me');
  } catch {
    return null;
  }
}

/** Upload a panel template image to Base44 storage — returns a public URL */
export async function uploadPanelTemplateFile(file) {
  const result = await withTimeout(
    base44.integrations.Core.UploadFile({ file }),
    API_TIMEOUT_MS,
    'Template upload',
  );
  const url = result?.file_url;
  if (!url) throw new Error('Upload succeeded but no file_url returned');
  return url;
}

export async function filterPanelConfig(name, query = {}) {
  return withTimeout(
    base44.entities.PanelConfig.filter({ name, ...query }),
    API_TIMEOUT_MS,
    `PanelConfig.filter (${name})`,
  );
}

export async function filterActivePanelConfig(query = {}) {
  return withTimeout(
    base44.entities.PanelConfig.filter({ is_active: true, ...query }),
    API_TIMEOUT_MS,
    'PanelConfig.filter (active)',
  );
}

export async function createPanelConfigRow(payload) {
  return withTimeout(
    base44.entities.PanelConfig.create(payload),
    API_TIMEOUT_MS,
    'PanelConfig.create',
  );
}

export async function updatePanelConfigRow(id, payload) {
  return withTimeout(
    base44.entities.PanelConfig.update(id, payload),
    API_TIMEOUT_MS,
    'PanelConfig.update',
  );
}

export async function filterActiveSiteProject() {
  return withTimeout(
    base44.entities.SiteProject.filter({ is_active: true }),
    API_TIMEOUT_MS,
    'SiteProject.filter (active)',
  );
}

export async function createSiteProjectRow(payload) {
  return withTimeout(
    base44.entities.SiteProject.create(payload),
    API_TIMEOUT_MS,
    'SiteProject.create',
  );
}

export async function updateSiteProjectRow(id, payload) {
  return withTimeout(
    base44.entities.SiteProject.update(id, payload),
    API_TIMEOUT_MS,
    'SiteProject.update',
  );
}
