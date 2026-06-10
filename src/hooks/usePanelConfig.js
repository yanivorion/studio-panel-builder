import { useState, useEffect, useMemo, useCallback } from 'react';
import { createGetLayoutSlot } from '../panelConfig/panelLayoutSlot.jsx';
import { resolvePanelConfigState } from '../services/panelConfigResolve.js';
import { buildDefaultGroups, mergeDefaultPanelStructure } from '../panelConfig/panelStructure.js';
import { DEFAULT_CATEGORIES } from '../ui/addPanelData.js';

export function usePanelConfig(panelSnapshot) {
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [groupLayouts, setGroupLayouts] = useState({});
  const [layoutName, setLayoutName] = useState('');

  const reload = useCallback(async (snapshot = panelSnapshot) => {
    setLoading(true);
    try {
      const state = await resolvePanelConfigState(snapshot);
      const merged = mergeDefaultPanelStructure(state.categories, state.groups);
      setCategories(merged.categories);
      setGroups(merged.groups?.length ? merged.groups : buildDefaultGroups(DEFAULT_CATEGORIES));
      setTemplates(state.templates);
      setGroupLayouts(state.groupLayouts);
      setLayoutName(state.layoutName);
    } finally {
      setLoading(false);
    }
  }, [panelSnapshot]);

  useEffect(() => {
    reload(panelSnapshot);
  }, [panelSnapshot, reload]);

  const templatesById = useMemo(
    () => templates.reduce((acc, t) => { acc[t.id] = t; return acc; }, {}),
    [templates],
  );

  const getLayoutSlot = useMemo(
    () => createGetLayoutSlot({
      groupLayouts,
      templatesById,
      groups,
      editMode: false,
      requireExplicitSeed: true,
    }),
    [groupLayouts, templatesById, groups],
  );

  return {
    loading,
    categories,
    groups,
    templates,
    groupLayouts,
    layoutName,
    templatesById,
    getLayoutSlot,
    reload,
  };
}
