import React from 'react';
import { tokens } from '../ui/tokens.js';
import { PanelEditMode } from './PanelEditMode.jsx';
import '../layoutBuilder/layoutBuilder.css';

export function LayoutBuilderEditor({
  onClose,
  initialPanel,
  onPanelSave,
  pageLabel,
  editScope,
  onEditScopeChange,
  onVariantTabChange,
  pageVisibility,
  onPageVisibilityChange,
}) {
  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      backgroundColor: tokens.bg0,
    }}>
      <PanelEditMode
        onClose={onClose}
        initialPanel={initialPanel}
        onPanelSave={onPanelSave}
        pageLabel={pageLabel}
        editScope={editScope}
        onEditScopeChange={onEditScopeChange}
        onVariantTabChange={onVariantTabChange}
        pageVisibility={pageVisibility}
        onPageVisibilityChange={onPageVisibilityChange}
      />
    </div>
  );
}
