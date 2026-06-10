import { GridEngineConfig, TemplateAsset, TemplateSubgroup } from './types';

import { PANEL_TEMPLATE_MANIFEST } from '../../data/panelTemplateManifest.js';

// Starter assets from Studio Add Panel /public/panel
export const IMAGE_PATHS = PANEL_TEMPLATE_MANIFEST.map(t => t.path);

/** Add Panel tab targets — each subgroup maps to a tab's inner content area */
export const ADD_PANEL_TAB_SUBGROUPS: TemplateSubgroup[] = [
  { id: 'elements-home', name: 'Elements — Home', templateIds: [] },
  { id: 'elements-catalog', name: 'Elements — Catalog', templateIds: [] },
  { id: 'sections', name: 'Sections', templateIds: [] },
  { id: 'apps', name: 'Apps', templateIds: [] },
];

export const DEFAULT_SUBGROUPS = ADD_PANEL_TAB_SUBGROUPS;

export const resolveInitialSubgroups = (templateIds: string[]): TemplateSubgroup[] => {
  const ids = [...templateIds];
  const home = ids.slice(0, Math.ceil(ids.length * 0.4));
  const catalog = ids.slice(Math.ceil(ids.length * 0.4), Math.ceil(ids.length * 0.7));
  const sections = ids.slice(Math.ceil(ids.length * 0.7), Math.ceil(ids.length * 0.85));
  const apps = ids.slice(Math.ceil(ids.length * 0.85));
  return [
    { id: 'elements-home', name: 'Elements — Home', templateIds: home.length ? home : ids },
    { id: 'elements-catalog', name: 'Elements — Catalog', templateIds: catalog.length ? catalog : ids },
    { id: 'sections', name: 'Sections', templateIds: sections.length ? sections : ids },
    { id: 'apps', name: 'Apps', templateIds: apps.length ? apps : ids },
  ];
};

const IMAGE_DIM_TIMEOUT_MS = 4000;
const FALLBACK_DIMS = { width: 240, height: 160 };

export const loadImageDimensions = (
  src: string,
  timeoutMs = IMAGE_DIM_TIMEOUT_MS,
): Promise<{ width: number; height: number }> =>
  new Promise((resolve) => {
    let settled = false;
    const finish = (dims: { width: number; height: number }) => {
      if (settled) return;
      settled = true;
      resolve(dims);
    };

    const timer = window.setTimeout(() => finish(FALLBACK_DIMS), timeoutMs);
    const img = new Image();
    img.onload = () => {
      window.clearTimeout(timer);
      finish({
        width: img.naturalWidth || FALLBACK_DIMS.width,
        height: img.naturalHeight || FALLBACK_DIMS.height,
      });
    };
    img.onerror = () => {
      window.clearTimeout(timer);
      finish(FALLBACK_DIMS);
    };
    img.src = src;
  });

let templatesCache: TemplateAsset[] | null = null;
let templatesPromise: Promise<TemplateAsset[]> | null = null;

export const loadInitialTemplates = async (): Promise<TemplateAsset[]> => {
  if (templatesCache) return templatesCache;
  if (templatesPromise) return templatesPromise;

  templatesPromise = Promise.all(
    PANEL_TEMPLATE_MANIFEST.map(async (entry) => {
      const path = entry.path;
      const src = path.startsWith('/') ? path : `/images/${encodeURIComponent(path)}`;
      const size = await loadImageDimensions(src);
      return {
        id: entry.id,
        name: entry.name,
        src,
        width: size.width,
        height: size.height,
      };
    }),
  ).then((templates) => {
    templatesCache = templates;
    return templates;
  }).catch((err) => {
    templatesPromise = null;
    throw err;
  });

  return templatesPromise;
};

/** Clear cached templates (e.g. after hot reload in dev) */
export const resetInitialTemplatesCache = () => {
  templatesCache = null;
  templatesPromise = null;
};

type CmsTemplateLike = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  src?: string;
  preview?: { en?: { value?: string } };
  dimensions?: { width?: number; height?: number };
  width?: number;
  height?: number;
};

type CmsSubgroupLike = {
  id?: string;
  _id?: string;
  name?: string;
  title?: string;
  templateIds?: string[];
  previewTemplateIds?: string[];
  templates?: string[] | CmsTemplateLike[];
};

type CmsSeedLike = {
  templates?: CmsTemplateLike[];
  subgroups?: CmsSubgroupLike[];
  gridEngine?: GridEngineConfig;
};

export interface CmsResolvedData {
  templates: TemplateAsset[];
  subgroups: TemplateSubgroup[];
  orderedTemplateIdsBySubgroup: Record<string, string[]>;
  gridEngine?: GridEngineConfig;
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.trim() ? value.trim() : undefined;

const getTemplateSrc = (template: CmsTemplateLike): string | undefined =>
  asString(template.src) ?? asString(template.preview?.en?.value);

const normalizeCmsTemplate = async (
  template: CmsTemplateLike,
  index: number,
): Promise<TemplateAsset | null> => {
  const id = asString(template.id) ?? asString(template._id) ?? `cms-tpl-${index}`;
  const src = getTemplateSrc(template);
  if (!src) {
    return null;
  }
  const explicitWidth = template.dimensions?.width ?? template.width;
  const explicitHeight = template.dimensions?.height ?? template.height;
  const size =
    explicitWidth && explicitHeight
      ? { width: explicitWidth, height: explicitHeight }
      : await loadImageDimensions(src);

  return {
    id,
    name: asString(template.name) ?? asString(template.title) ?? id,
    src,
    width: Math.max(1, size.width),
    height: Math.max(1, size.height),
  };
};

const extractTemplateIdsFromSubgroup = (
  subgroup: CmsSubgroupLike,
  templatesById: Record<string, TemplateAsset>,
): string[] => {
  if (Array.isArray(subgroup.templateIds) && subgroup.templateIds.length > 0) {
    return subgroup.templateIds.filter((id) => Boolean(templatesById[id]));
  }
  if (
    Array.isArray(subgroup.previewTemplateIds) &&
    subgroup.previewTemplateIds.length > 0
  ) {
    return subgroup.previewTemplateIds.filter((id) => Boolean(templatesById[id]));
  }
  if (Array.isArray(subgroup.templates) && subgroup.templates.length > 0) {
    const fromStrings = subgroup.templates
      .map((entry) => (typeof entry === 'string' ? entry : entry._id ?? entry.id))
      .filter((id): id is string => Boolean(id))
      .filter((id) => Boolean(templatesById[id]));
    if (fromStrings.length > 0) {
      return fromStrings;
    }
  }
  return [];
};

const resolveSubgroupsFromCms = (
  cmsSubgroups: CmsSubgroupLike[] | undefined,
  templates: TemplateAsset[],
): { subgroups: TemplateSubgroup[]; orderedTemplateIdsBySubgroup: Record<string, string[]> } => {
  const allIds = templates.map((template) => template.id);
  const templatesById = templates.reduce<Record<string, TemplateAsset>>((acc, template) => {
    acc[template.id] = template;
    return acc;
  }, {});

  if (!cmsSubgroups || cmsSubgroups.length === 0) {
    const fallback = resolveInitialSubgroups(allIds);
    return {
      subgroups: fallback,
      orderedTemplateIdsBySubgroup: fallback.reduce<Record<string, string[]>>((acc, subgroup) => {
        acc[subgroup.id] = [...subgroup.templateIds];
        return acc;
      }, {}),
    };
  }

  const normalized = cmsSubgroups
    .map((subgroup, index) => {
      const id = asString(subgroup.id) ?? asString(subgroup._id) ?? `cms-sg-${index}`;
      const name = asString(subgroup.name) ?? asString(subgroup.title) ?? `Subgroup ${index + 1}`;
      const templateIds = extractTemplateIdsFromSubgroup(subgroup, templatesById);
      return { id, name, templateIds };
    })
    .filter((subgroup) => subgroup.templateIds.length > 0);

  const withAll =
    normalized.find((subgroup) => subgroup.id === 'all')
      ? normalized
      : [{ id: 'all', name: 'All Templates', templateIds: allIds }, ...normalized];

  return {
    subgroups: withAll,
    orderedTemplateIdsBySubgroup: withAll.reduce<Record<string, string[]>>((acc, subgroup) => {
      acc[subgroup.id] = [...subgroup.templateIds];
      return acc;
    }, {}),
  };
};

const isGridEngine = (value: unknown): value is GridEngineConfig =>
  Boolean(value) &&
  typeof value === 'object' &&
  (value as GridEngineConfig).version === 1 &&
  Array.isArray((value as GridEngineConfig).breakpoints);

export const resolveCmsSeedData = async (): Promise<CmsResolvedData | null> => {
  const globalPayload = (globalThis as { __CMS_LAYOUT_BUILDER_DATA__?: CmsSeedLike })
    .__CMS_LAYOUT_BUILDER_DATA__;

  let payload: CmsSeedLike | null = globalPayload ?? null;

  if (!payload && typeof window !== 'undefined') {
    const params = new URLSearchParams(window.location.search);
    const cmsDataUrl = params.get('cmsDataUrl');
    if (cmsDataUrl) {
      try {
        const response = await fetch(cmsDataUrl);
        if (response.ok) {
          payload = (await response.json()) as CmsSeedLike;
        }
      } catch (error) {
        console.error('Failed to load cmsDataUrl payload', error);
      }
    }
  }

  if (!payload?.templates || payload.templates.length === 0) {
    return null;
  }

  const normalizedTemplates = (
    await Promise.all(payload.templates.map((template, index) => normalizeCmsTemplate(template, index)))
  ).filter((template): template is TemplateAsset => Boolean(template));

  if (normalizedTemplates.length === 0) {
    return null;
  }

  const subgroupData = resolveSubgroupsFromCms(payload.subgroups, normalizedTemplates);

  return {
    templates: normalizedTemplates,
    subgroups: subgroupData.subgroups,
    orderedTemplateIdsBySubgroup: subgroupData.orderedTemplateIdsBySubgroup,
    gridEngine: isGridEngine(payload.gridEngine) ? payload.gridEngine : undefined,
  };
};
