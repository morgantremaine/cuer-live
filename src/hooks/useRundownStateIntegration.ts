
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
  // Store stable references to prevent re-renders
  const stableRefsRef = useRef({
    markAsChanged,
    setRundownTitleDirectly,
    setTimezoneDirectly
  });

  // Only update refs if the actual functions have changed
  if (stableRefsRef.current.markAsChanged !== markAsChanged) {
    stableRefsRef.current.markAsChanged = markAsChanged;
  }
  if (stableRefsRef.current.setRundownTitleDirectly !== setRundownTitleDirectly) {
    stableRefsRef.current.setRundownTitleDirectly = setRundownTitleDirectly;
  }
  if (stableRefsRef.current.setTimezoneDirectly !== setTimezoneDirectly) {
    stableRefsRef.current.setTimezoneDirectly = setTimezoneDirectly;
  }

  // Rundown items management
  const itemsHook = useRundownItems();

  // Column management with stable markAsChanged reference
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
