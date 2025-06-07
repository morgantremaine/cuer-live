
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
  const { updateRundown, saveRundown } = useRundownStorage();
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
    if (isProcessingRealtimeUpdate) {
      console.log('⏭️ Skipping auto-save - processing realtime update');
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
      console.log('⏭️ Skipping auto-save - no changes detected');
      return;
    }

    console.log('💾 Auto-saving rundown...', {
      rundownId,
      title: rundownTitle,
      itemsCount: items?.length || 0,
      timezone,
      startTime: rundownStartTime,
      isNewRundown: !rundownId
    });

    setIsSaving(true);

    try {
      if (rundownId) {
        // Update existing rundown
        await updateRundown(rundownId, {
          title: rundownTitle,
          items: items || [],
          columns: columns || [],
          timezone,
          start_time: rundownStartTime
        });
        console.log('✅ Auto-save completed successfully (update)');
      } else {
        // Save new rundown
        const newRundown = {
          id: '',
          user_id: '',
          title: rundownTitle || 'Untitled Rundown',
          items: items || [],
          columns: columns || [],
          timezone,
          start_time: rundownStartTime,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          archived: false
        };
        
        const newRundownId = await saveRundown(newRundown);
        console.log('✅ Auto-save completed successfully (new rundown)', newRundownId);
      }

      // Update our tracking
      lastSaveDataRef.current = currentSignature;
      markAsSaved(items, rundownTitle, columns, timezone, rundownStartTime);

    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [rundownId, rundownTitle, items, columns, timezone, rundownStartTime, updateRundown, saveRundown, markAsSaved, isProcessingRealtimeUpdate]);

  // Auto-save effect with debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || isProcessingRealtimeUpdate) {
      return;
    }

    console.log('🔄 Changes detected, scheduling auto-save...', {
      hasUnsavedChanges,
      rundownId,
      title: rundownTitle
    });

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
