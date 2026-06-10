/** Per-page canvas + panel helpers for multi-page flows. */

export function getPageCanvas(site, pageId) {
  const pid = pageId ?? site?.currentPage ?? 'home';

  if (site?.pageData?.[pid]) {
    return {
      sections: site.pageData[pid].sections ?? [],
      elements: site.pageData[pid].elements ?? [],
    };
  }

  // Legacy: flat sections/elements on site root
  if (!site?.pageData && pid === (site?.currentPage ?? 'home')) {
    return {
      sections: site?.sections ?? [],
      elements: site?.elements ?? [],
    };
  }

  return { sections: [], elements: [] };
}

export function buildPageData(pages, seed = {}) {
  const pageData = {};
  (pages ?? []).forEach(page => {
    pageData[page.id] = seed[page.id] ?? { sections: [], elements: [] };
  });
  return pageData;
}

export function siteViewForPage(site, pageId = site?.currentPage) {
  const canvas = getPageCanvas(site, pageId);
  return {
    pages: site?.pages ?? [],
    currentPage: pageId ?? site?.currentPage ?? 'home',
    sections: canvas.sections,
    elements: canvas.elements,
    pageData: site?.pageData,
  };
}

export function mergePageCanvas(site, pageId, canvas) {
  const pageData = { ...(site?.pageData ?? {}) };
  pageData[pageId] = {
    sections: canvas.sections ?? [],
    elements: canvas.elements ?? [],
  };
  const { sections: _s, elements: _e, ...rest } = site ?? {};
  return { ...rest, pageData, currentPage: pageId };
}
