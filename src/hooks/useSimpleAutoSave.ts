
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
  const saveInProgressRef = useRef<boolean>(false);
  const consecutiveSaveAttemptsRef = useRef<number>(0);
  const lastSaveAttemptRef = useRef<number>(0);

  useEffect(() => {
    // Validate rundownId first
    if (!rundownId || rundownId === ':id' || rundownId.trim() === '') {
      return;
    }

    if (!isInitialized || !hasUnsavedChanges || saveInProgressRef.current) {
      return;
    }

    // Rate limiting: don't attempt save more than once every 2 seconds
    const now = Date.now();
    if (now - lastSaveAttemptRef.current < 2000) {
      return;
    }

    // Create signature to prevent duplicate saves
    const currentData = JSON.stringify({ 
      items: items.map(item => ({ id: item.id, name: item.name, startTime: item.startTime, duration: item.duration })), 
      rundownTitle, 
      columns: columns.map(col => ({ id: col.id, name: col.name })), 
      timezone, 
      rundownStartTime 
    });

    if (currentData === lastSaveDataRef.current) {
      return;
    }

    // Prevent excessive save attempts
    if (consecutiveSaveAttemptsRef.current > 3) {
      console.log('Simple auto-save: Too many consecutive save attempts, backing off');
      consecutiveSaveAttemptsRef.current = 0;
      return;
    }

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    lastSaveAttemptRef.current = now;
    consecutiveSaveAttemptsRef.current++;

    console.log('Simple auto-save: Scheduling save for rundown:', rundownId, 'attempt:', consecutiveSaveAttemptsRef.current);

    // Longer debounce to prevent excessive saves
    saveTimeoutRef.current = setTimeout(async () => {
      if (saveInProgressRef.current) {
        return;
      }

      try {
        saveInProgressRef.current = true;
        setIsSaving(true);
        console.log('Simple auto-save: Starting save for rundown:', rundownId, 'with', items.length, 'items');
        
        await updateRundown(rundownId, rundownTitle, items, true, false, columns, timezone, rundownStartTime);

        lastSaveDataRef.current = currentData;
        consecutiveSaveAttemptsRef.current = 0; // Reset on successful save
        markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);
        console.log('Simple auto-save: Save completed successfully');
      } catch (error) {
        console.error('Simple auto-save: Save failed for rundown:', rundownId, 'Error:', error);
        consecutiveSaveAttemptsRef.current = Math.max(0, consecutiveSaveAttemptsRef.current - 1);
      } finally {
        saveInProgressRef.current = false;
        setIsSaving(false);
      }
    }, 5000); // Increased from 3000 to 5000ms

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [rundownId, items, rundownTitle, columns, timezone, rundownStartTime, hasUnsavedChanges, isInitialized, updateRundown, markAsSaved]);

  return { isSaving };
};
