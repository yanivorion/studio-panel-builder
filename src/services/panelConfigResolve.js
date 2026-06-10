import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';
import { buildDefaultGroups } from '../panelConfig/panelStructure.js';
import { createDefaultGroupLayoutState } from '../panelConfig/panelZones.js';
import { initAllGroupLayouts } from '../panelConfig/initGroupLayouts.js';
import { loadInitialTemplates } from '../layoutBuilder/builder/mockData';
import { mergePanelConfigFromSave } from './panelConfigSerialize.js';

export async function resolvePanelConfigState(saved) {
  const loadedTemplates = await loadInitialTemplates();
  const categories = DEFAULT_CATEGORIES;
  const groups = buildDefaultGroups(categories);

  const merged = mergePanelConfigFromSave(saved ?? {}, {
    categories,
    groups,
    defaultTemplates: loadedTemplates,
    createLayoutState: (grps, templates) =>
      initAllGroupLayouts(grps, templates, createDefaultGroupLayoutState),
  });

  return {
    categories: merged.categories,
    groups: merged.groups,
    templates: merged.templates,
    groupLayouts: merged.groupLayouts,
    layoutName: merged.layoutName ?? '',
  };
}
