import { preparePanelConfigForSave } from './panelConfigSerialize.js';
import { buildSessionPayload } from './studioSessionService.js';

export const STUDIO_JSON_EXPORT_VERSION = 2;

/**
 * Build a portable JSON export: session (sites) + panel routing state.
 */
export function buildStudioJsonExport(session, panelState, activeFlowId) {
  return {
    exportVersion: STUDIO_JSON_EXPORT_VERSION,
    savedAt: Date.now(),
    activeFlowId,
    session: buildSessionPayload(session, activeFlowId),
    panelState,
    // Legacy v1 field — omitted in v2; importers may still read `panels`
  };
}

/** Trigger a browser download of the studio export JSON. */
export function downloadStudioJson(exportData, filename) {
  const stamp = new Date(exportData.savedAt ?? Date.now()).toISOString().slice(0, 10);
  const flow = exportData.activeFlowId ?? 'studio';
  const name = filename ?? `studio-export-${flow}-${stamp}.json`;
  const json = JSON.stringify(exportData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
  return { filename: name, bytes: json.length };
}
