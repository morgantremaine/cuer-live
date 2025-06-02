
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { useMemo, useRef, useEffect } from 'react';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void
) => {
  // Store stable references
  const stableRefs = useRef({
    markAsChanged,
    setRundownTitleDirectly,
    setTimezoneDirectly
  });

  // Update refs when functions change
  useEffect(() => {
    stableRefs.current = {
      markAsChanged,
      setRundownTitleDirectly,
      setTimezoneDirectly
    };
  }, [markAsChanged, setRundownTitleDirectly, setTimezoneDirectly]);

  // Rundown items management
  const itemsHook = useRundownItems();

  // Column management with stable markAsChanged reference
  const columnsHook = useColumnsManager(stableRefs.current.markAsChanged);

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
    markAsChanged: stableRefs.current.markAsChanged
  }), [
    itemsHook,
    columnsHook,
    autoSaveHook
  ]);
};
