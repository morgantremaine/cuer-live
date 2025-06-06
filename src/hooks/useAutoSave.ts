
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

  // Use change tracking to detect unsaved changes
  const {
    hasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, rundownStartTime);

  // Debug logging for change tracking
  useEffect(() => {
    console.log('📊 AutoSave change tracking debug:', {
      hasUnsavedChanges,
      itemsLength: items?.length || 0,
      rundownTitle,
      columnsLength: columns?.length || 0,
      timezone,
      rundownStartTime
    });
  }, [hasUnsavedChanges, items?.length, rundownTitle, columns?.length, timezone, rundownStartTime]);

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

  // Auto-save effect
  useEffect(() => {
    const rundownId = rundownIdRef.current;
    
    if (!rundownId || !hasUnsavedChanges || isSaving) {
      return;
    }

    console.log('⏰ Scheduling auto-save in 2 seconds...');
    const timer = setTimeout(() => {
      performAutoSave(rundownId);
    }, 2000);

    return () => {
      console.log('🧹 Clearing auto-save timer');
      clearTimeout(timer);
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
