
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { useMemo, useRef } from 'react';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void
) => {
  // Use refs for stable function references
  const stableRefsRef = useRef({
    markAsChanged,
    setRundownTitleDirectly,
    setTimezoneDirectly
  });

  // Update refs when functions change
  stableRefsRef.current.markAsChanged = markAsChanged;
  stableRefsRef.current.setRundownTitleDirectly = setRundownTitleDirectly;
  stableRefsRef.current.setTimezoneDirectly = setTimezoneDirectly;

  // Rundown items management
  const itemsHook = useRundownItems();

  // Column management with stable reference
  const columnsHook = useColumnsManager(stableRefsRef.current.markAsChanged);

  // Auto-save functionality
  const autoSaveHook = useAutoSave(
    itemsHook.items,
    rundownTitle,
    columnsHook.columns,
    timezone,
    rundownStartTime
  );

  // Memoize the return object to prevent unnecessary re-renders
  return useMemo(() => ({
    ...itemsHook,
    ...columnsHook,
    ...autoSaveHook,
    markAsChanged: stableRefsRef.current.markAsChanged
  }), [
    itemsHook,
    columnsHook,
    autoSaveHook
  ]);
};
