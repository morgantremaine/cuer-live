
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useAutoSave = (
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string
) => {
  const { updateRundown } = useRundownStorage();
  const [isSaving, setIsSaving] = useState(false);
  const rundownIdRef = useRef<string | null>(null);
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Use change tracking to detect unsaved changes
  const {
    hasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, rundownStartTime);

  const performAutoSave = useCallback(async (rundownId: string) => {
    if (!rundownId || isSaving || !hasUnsavedChanges) {
      console.log('⏭️ Skipping auto-save:', { rundownId: !!rundownId, isSaving, hasUnsavedChanges });
      return;
    }

    console.log('💾 Starting auto-save...');
    setIsSaving(true);
    setIsLoading(true);

    try {
      await updateRundown(
        rundownId,
        rundownTitle,
        items,
        true, // silent
        false, // not archived
        columns,
        timezone,
        rundownStartTime
      );

      markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);
      console.log('✅ Auto-save completed successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
      setIsLoading(false);
    }
  }, [updateRundown, rundownTitle, items, columns, timezone, rundownStartTime, hasUnsavedChanges, isSaving, markAsSaved, setIsLoading]);

  // Store rundown ID in ref for stable access
  const setRundownId = useCallback((id: string | null) => {
    rundownIdRef.current = id;
    console.log('🔗 Auto-save rundown ID set to:', id);
  }, []);

  // Simplified auto-save effect with debouncing
  useEffect(() => {
    // Clear any existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    const rundownId = rundownIdRef.current;
    
    if (!rundownId || !hasUnsavedChanges || isSaving) {
      return;
    }

    console.log('⏰ Scheduling auto-save in 3 seconds...');
    autoSaveTimerRef.current = setTimeout(() => {
      performAutoSave(rundownId);
      autoSaveTimerRef.current = null;
    }, 3000); // Increased to 3 seconds for better debouncing

    return () => {
      if (autoSaveTimerRef.current) {
        console.log('🧹 Clearing auto-save timer');
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
    };
  }, [hasUnsavedChanges, isSaving, performAutoSave]);

  return {
    hasUnsavedChanges,
    isSaving,
    setRundownId,
    markAsChanged,
    markAsSaved: (items: RundownItem[], title: string, columns?: Column[], timezone?: string, startTime?: string) => 
      markAsSaved(items, title, columns, timezone, startTime)
  };
};
