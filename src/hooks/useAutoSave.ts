
import React, { useEffect, useRef, useCallback } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownBasicState } from './useRundownBasicState';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';

export const useAutoSave = (
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const { rundownId } = useRundownBasicState();
  const { updateRundown } = useRundownStorage();
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const [isSaving, setIsSaving] = React.useState(false);

  const {
    hasUnsavedChanges,
    markAsSaved,
    updateSavedSignature,
    setApplyingRemoteUpdate,
    setIgnoreShowcallerChanges
  } = useChangeTracking(
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime,
    isProcessingRealtimeUpdate
  );

  // Auto-save function with enhanced data validation
  const performAutoSave = useCallback(async () => {
    if (!rundownId || isProcessingRealtimeUpdate) {
      return;
    }

    // Create current data signature for comparison
    const currentData = {
      title: rundownTitle,
      items: items || [],
      columns: columns || [],
      timezone,
      start_time: rundownStartTime
    };

    const currentSignature = JSON.stringify(currentData);

    // Skip if data hasn't changed since last save
    if (currentSignature === lastSaveDataRef.current) {
      return;
    }

    console.log('💾 Auto-saving rundown...', {
      rundownId,
      title: rundownTitle,
      itemsCount: items?.length || 0,
      timezone,
      startTime: rundownStartTime
    });

    setIsSaving(true);

    try {
      // Only save actual content changes, not showcaller state
      await updateRundown(rundownId, {
        title: rundownTitle,
        items: items || [],
        columns: columns || [],
        timezone,
        start_time: rundownStartTime
      });

      // Update our tracking
      lastSaveDataRef.current = currentSignature;
      markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);

      console.log('✅ Auto-save completed successfully');
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, rundownTitle, items, columns, timezone, rundownStartTime, updateRundown, markAsSaved, isProcessingRealtimeUpdate]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || isProcessingRealtimeUpdate) {
      return;
    }

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set a new timeout for auto-save
    saveTimeoutRef.current = setTimeout(() => {
      performAutoSave();
    }, 2000); // 2 second delay

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, performAutoSave, isProcessingRealtimeUpdate]);

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
    isSaving,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setIgnoreShowcallerChanges
  };
};
