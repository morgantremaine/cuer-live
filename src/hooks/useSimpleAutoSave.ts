
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
    // Validate rundownId first
    if (!rundownId || rundownId === ':id' || rundownId.trim() === '') {
      console.log('Simple auto-save: Skipping save - invalid rundownId:', rundownId);
      return;
    }

    if (!isInitialized || !hasUnsavedChanges) {
      console.log('Simple auto-save: Skipping save - not initialized or no changes:', { isInitialized, hasUnsavedChanges });
      return;
    }

    // Create signature to prevent duplicate saves
    const currentData = JSON.stringify({ items, rundownTitle, columns, timezone, rundownStartTime });
    if (currentData === lastSaveDataRef.current) {
      console.log('Simple auto-save: Skipping save - no data changes detected');
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
        console.log('Simple auto-save: Starting save for rundown:', rundownId, 'with', items.length, 'items');
        
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, rundownStartTime);

        lastSaveDataRef.current = currentData;
        markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);
        console.log('Simple auto-save: Save completed successfully');
      } catch (error) {
        console.error('Simple auto-save: Save failed for rundown:', rundownId, 'Error:', error);
        // Don't update lastSaveDataRef on failure so it will retry
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
