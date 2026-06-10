import React from 'react';

/** Tab strip: Global (shared layout) vs This page (page layout + visibility). */
export function VariantTabBar({
  tabs = [],
  activeTabId,
  onSelect,
}) {
  return (
    <div className="vtab-strip-wrap">
      <div className="vtab-strip" role="tablist" aria-label="Panel edit scope">
        {tabs.map(tab => {
          const active = tab.id === activeTabId;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              className={`vtab${active ? ' vtab-active' : ''}${tab.type === 'global' ? ' vtab-pinned' : ''}`}
              onClick={() => onSelect?.(tab)}
              title={tab.label}
            >
              <span className="vtab-label">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function buildVariantTabs({ includeGlobal = true, includePage = true } = {}) {
  const list = [];
  if (includeGlobal) {
    list.push({ id: '__global__', label: 'Global', type: 'global' });
  }
  if (includePage) {
    list.push({ id: '__page__', label: 'This page', type: 'page' });
  }
  return list;
}

export function activeTabIdFromScope(editScope) {
  if (editScope === 'global') return '__global__';
  return '__page__';
}

export function scopeFromTab(tab) {
  if (tab.type === 'global') return 'global';
  return 'page';
}
