
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (
  items: RundownItem[], 
  rundownTitle: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime, isProcessingRealtimeUpdate);

  // Create a debounced save function that's stable across renders
  const debouncedSave = useCallback(async (
    itemsToSave: RundownItem[], 
    titleToSave: string, 
    columnsToSave?: Column[], 
    timezoneToSave?: string, 
    startTimeToSave?: string
  ) => {
    if (!user || isSaving || isProcessingRealtimeUpdate) {
      console.log('💾 Skipping auto-save:', { 
        noUser: !user, 
        isSaving, 
        isProcessingRealtimeUpdate 
      });
      return;
    }

    // Mark as loading to prevent change detection during save
    setIsLoading(true);

    try {
      console.log('💾 Performing auto-save...', { isProcessingRealtimeUpdate });
      const success = await performSave(
        itemsToSave, 
        titleToSave, 
        columnsToSave, 
        timezoneToSave, 
        startTimeToSave
      );
      
      if (success) {
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, isSaving, isProcessingRealtimeUpdate, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading]);

  // Main effect that schedules saves
  useEffect(() => {
    // Clear any pending saves if we're processing a realtime update
    if (isProcessingRealtimeUpdate) {
      console.log('🛑 Clearing auto-save timeout due to realtime update processing');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    // Don't auto-save while processing realtime updates or if not ready
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Create a unique signature for this data
    const currentDataSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    
    // Only schedule if data actually changed
    if (lastSaveDataRef.current === currentDataSignature) {
      return;
    }

    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule new save
    console.log('⏰ Scheduling auto-save in 2 seconds...');
    debounceTimeoutRef.current = setTimeout(() => {
      // Double-check we're not processing realtime updates when the timeout fires
      if (!isProcessingRealtimeUpdate) {
        console.log('🚀 Executing scheduled auto-save');
        debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);
      } else {
        console.log('🛑 Skipping scheduled auto-save - realtime update in progress');
      }
      debounceTimeoutRef.current = null;
    }, 2000);

  }, [
    hasUnsavedChanges, 
    isInitialized, 
    user, 
    items, 
    rundownTitle, 
    columns, 
    timezone, 
    startTime, 
    debouncedSave, 
    isProcessingRealtimeUpdate
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const markAsChangedCallback = () => {
    if (!isProcessingRealtimeUpdate) {
      console.log('✏️ Marking as changed (not during realtime update)');
      markAsChanged();
    } else {
      console.log('🚫 Skipping mark as changed - realtime update in progress');
    }
  };

  return {
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isSaving,
    markAsChanged: markAsChangedCallback
  };
};
