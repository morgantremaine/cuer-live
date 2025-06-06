
import { useStableAutoSave } from './useStableAutoSave';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useRef, useCallback } from 'react';

export const useAutoSave = (
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string
) => {
  const rundownIdRef = useRef<string | null>(null);

  const {
    hasUnsavedChanges,
    isSaving,
    autoSaveState,
    markAsDirty
  } = useStableAutoSave(
    rundownIdRef.current,
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime
  );

  const setRundownId = useCallback((id: string | null) => {
    rundownIdRef.current = id;
    console.log('🔗 Auto-save rundown ID set to:', id);
  }, []);

  const markAsChanged = useCallback(() => {
    markAsDirty();
  }, [markAsDirty]);

  const markAsSaved = useCallback(() => {
    // This is now handled internally by the stable auto-save
    console.log('📌 Mark as saved called (handled internally)');
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    autoSaveState,
    setRundownId,
    markAsChanged,
    markAsSaved
  };
};
