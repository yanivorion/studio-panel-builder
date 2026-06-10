/**
 * Seed placeholder records. Run: cat scripts/seed-defaults.ts | npx base44 exec
 */
import { createClient } from '@base44/sdk';

const base44 = createClient({ appId: '6a2805fd0a257742b748317a' });

const panelRows = await base44.entities.PanelConfig.filter({ is_active: true });
if (!panelRows.length) {
  await base44.entities.PanelConfig.create({
    name: 'default',
    version: 'panel-edit-2',
    is_active: true,
    config_json: '{}',
  });
  console.log('Created PanelConfig placeholder');
}

const siteRows = await base44.entities.SiteProject.filter({ is_active: true });
if (!siteRows.length) {
  await base44.entities.SiteProject.create({
    name: 'alpine-aura',
    is_active: true,
    project_json: '{}',
  });
  console.log('Created SiteProject placeholder');
}
