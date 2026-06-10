import { migrateToSession, SESSION_VERSION } from './studioSessionService.js';
import {
  createDefaultPanelState,
  migrateLegacyFlowPanels,
  pagePatchKey,
  PANEL_STATE_VERSION,
} from './panelRouting.js';
import { isPanelConfigOnlyJson, parsePanelConfigImport } from './panelConfigSerialize.js';
import { ensureSitesInSession, getAllSiteIds } from './siteRegistry.js';
import { STUDIO_JSON_EXPORT_VERSION } from './studioJsonExport.js';

function panelStateFromLegacyPanels(panelsByFlow) {
  const panelState = createDefaultPanelState();
  for (const [flowId, pages] of Object.entries(panelsByFlow ?? {})) {
    for (const [pageId, config] of Object.entries(pages ?? {})) {
      if (config) panelState.pagePatches[pagePatchKey(flowId, pageId)] = config;
    }
  }
  return panelState;
}

/**
 * Parse and normalize an imported studio JSON file.
 * Supports export v1/v2 (session), legacy panels, and panel-only layout files.
 */
export function parseStudioImport(raw) {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid import — expected a JSON object');
  }

  if (isPanelConfigOnlyJson(raw)) {
    return {
      exportVersion: 0,
      activeFlowId: null,
      session: null,
      panelState: null,
      panelConfigOnly: parsePanelConfigImport(raw),
    };
  }

  const exportVersion = raw.exportVersion ?? 1;
  const sessionSource = raw.session ?? raw;

  if (!sessionSource?.flows && !sessionSource?.pages) {
    throw new Error('Invalid import — missing session flows');
  }

  let panelState = raw.panelState ?? sessionSource.panelState ?? null;

  if (!panelState && raw.panels) {
    panelState = panelStateFromLegacyPanels(raw.panels);
  }

  let session = migrateToSession({
    ...sessionSource,
    activeFlowId: raw.activeFlowId ?? sessionSource.activeFlowId ?? 'thalina',
    version: sessionSource.version ?? SESSION_VERSION - 1,
  });

  if (panelState) {
    session = {
      ...session,
      panelState: {
        ...createDefaultPanelState(),
        ...panelState,
        version: panelState.version ?? PANEL_STATE_VERSION,
      },
    };
  } else if (raw.panels) {
    session = migrateLegacyFlowPanels(session, raw.panels);
  }

  session = ensureSitesInSession(migrateToSession(session));

  return {
    exportVersion,
    activeFlowId: raw.activeFlowId ?? session.activeFlowId ?? 'thalina',
    session,
    panelState: session.panelState ?? createDefaultPanelState(),
  };
}

export function readStudioImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result ?? ''));
        resolve(parseStudioImport(parsed));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('Could not parse JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Could not read file'));
    reader.readAsText(file);
  });
}

export function importSummary(parsed) {
  if (parsed.panelConfigOnly) {
    return {
      exportVersion: 0,
      flowCount: 0,
      presetCount: 0,
      patchCount: 0,
      activeFlowId: parsed.activeFlowId,
      panelConfigOnly: true,
    };
  }
  const flowCount = getAllSiteIds(parsed.session).length;
  const presetCount = Object.keys(parsed.panelState?.presets ?? {}).length;
  const patchCount = Object.keys(parsed.panelState?.pagePatches ?? {}).length;
  return {
    exportVersion: parsed.exportVersion ?? STUDIO_JSON_EXPORT_VERSION,
    flowCount,
    presetCount,
    patchCount,
    activeFlowId: parsed.activeFlowId,
  };
}
