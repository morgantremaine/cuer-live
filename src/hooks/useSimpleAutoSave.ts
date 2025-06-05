
import { useEffect, useRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useRundownStorage } from './useRundownStorage';

export const useSimpleAutoSave = (
  rundownId: string | undefined,
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string,
  hasUnsavedChanges: boolean,
  isInitialized: boolean,
  markAsSaved: (items: RundownItem[], title: string, columns?: Column[], timezone?: string, startTime?: string) => void
) => {
  const [isSaving, setIsSaving] = useState(false);
  const { updateRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  useEffect(() => {
    if (!rundownId || !isInitialized || !hasUnsavedChanges) {
      return;
    }

    // Create signature to prevent duplicate saves
    const currentData = JSON.stringify({ items, rundownTitle, columns, timezone, rundownStartTime });
    if (currentData === lastSaveDataRef.current) {
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce the save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        setIsSaving(true);
        console.log('Simple auto-save: Saving rundown with', items.length, 'items');
        
        await updateRundown(rundownId, rundownTitle, items, false, false, columns, timezone, rundownStartTime);

        lastSaveDataRef.current = currentData;
        markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);
        console.log('Simple auto-save: Save completed');
      } catch (error) {
        console.error('Simple auto-save: Save failed:', error);
      } finally {
        setIsSaving(false);
      }
    }, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [rundownId, items, rundownTitle, columns, timezone, rundownStartTime, hasUnsavedChanges, isInitialized, updateRundown, markAsSaved]);

  return { isSaving };
};
