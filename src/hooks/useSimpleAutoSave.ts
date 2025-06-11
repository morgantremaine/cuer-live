
import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useRundownStorage } from './useRundownStorage';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

export const useSimpleAutoSave = (
  rundownId: string | undefined,
  items: RundownItem[],
  title: string,
  columns: Column[],
  timezone: string,
  startTime: string
) => {
  const { user } = useAuth();
  const { updateRundown, saveRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const lastSaveDataRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isInitializedRef = useRef(false);
  const skipNextChangeRef = useRef(false);

  const performSave = useCallback(async () => {
    if (!user || isSavingRef.current || !rundownId) return false;

    isSavingRef.current = true;
    setIsSaving(true);

    try {
      // Update existing rundown
      await updateRundown(
        rundownId,
        title,
        items,
        true, // silent
        false, // not archived
        columns,
        timezone,
        startTime
      );
      
      // Update the saved data reference and clear unsaved changes
      const currentData = JSON.stringify({ items, title, columns, timezone, startTime });
      lastSaveDataRef.current = currentData;
      setHasUnsavedChanges(false);
      skipNextChangeRef.current = true; // Skip the next change detection

      return true;
    } catch (error) {
      console.error('Auto-save failed:', error);
      return false;
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [user, rundownId, updateRundown, title, items, columns, timezone, startTime]);

  // Main auto-save effect
  useEffect(() => {
    const currentData = JSON.stringify({ items, title, columns, timezone, startTime });
    
    // Initialize on first run - don't trigger save
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      lastSaveDataRef.current = currentData;
      return;
    }

    // Skip if we just saved and this is the echo
    if (skipNextChangeRef.current) {
      skipNextChangeRef.current = false;
      return;
    }

    // Skip if we're currently saving
    if (isSavingRef.current) {
      return;
    }

    // Check if data has actually changed
    const hasChanges = lastSaveDataRef.current !== currentData;
    
    if (hasChanges) {
      setHasUnsavedChanges(true);

      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Set new timeout for auto-save
      saveTimeoutRef.current = setTimeout(() => {
        if (!isSavingRef.current) {
          performSave();
        }
      }, 3000); // 3 second delay for auto-save
    }

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [items, title, columns, timezone, startTime, performSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving
  };
};
