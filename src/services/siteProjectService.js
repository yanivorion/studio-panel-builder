import { base44 } from '../api/base44Client.js';
import { isBase44Backend } from './backend.js';

const ACTIVE_NAME = 'alpine-aura';

export async function loadSiteProject() {
  if (!isBase44Backend()) return null;
  try {
    const rows = await base44.entities.SiteProject.filter({ is_active: true });
    if (!rows.length) return null;
    return JSON.parse(rows[0].project_json);
  } catch (err) {
    console.warn('[siteProject] load failed', err);
    return null;
  }
}

export async function saveSiteProject(project) {
  if (!isBase44Backend()) return null;
  const payload = {
    name: project.name || ACTIVE_NAME,
    is_active: true,
    project_json: JSON.stringify(project),
  };

  const existing = await base44.entities.SiteProject.filter({ is_active: true });
  if (existing.length) {
    await base44.entities.SiteProject.update(existing[0].id, payload);
    return existing[0].id;
  }

  const created = await base44.entities.SiteProject.create(payload);
  return created.id;
}
