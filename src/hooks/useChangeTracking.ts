// This file is no longer needed as we've simplified auto-save
// Keeping a minimal version for backward compatibility

import { useState } from 'react';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useChangeTracking = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // This hook is now deprecated - auto-save is handled in useAutoSave directly
  const markAsSaved = () => {
    setHasUnsavedChanges(false);
  };

  const markAsChanged = () => {
    setHasUnsavedChanges(true);
  };

  return {
    hasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isInitialized: true
  };
};
