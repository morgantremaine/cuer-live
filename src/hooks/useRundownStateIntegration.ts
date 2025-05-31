
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { useCallback } from 'react';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void
) => {
  const rundownData = useRundownItems();
  const columnsData = useColumnsManager();
  
  // Auto-save functionality
  const { hasUnsavedChanges, isSaving } = useAutoSave({
    rundownTitle,
    timezone,
    items: rundownData.items,
    columns: columnsData.columns,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly
  });

  return {
    ...rundownData,
    ...columnsData,
    hasUnsavedChanges,
    isSaving
  };
};
