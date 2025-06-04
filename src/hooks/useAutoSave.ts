
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const isSavingRef = useRef(false);
  const saveQueueRef = useRef<boolean>(false);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime);

  // Update the saving ref when isSaving changes
  useEffect(() => {
    isSavingRef.current = isSaving;
  }, [isSaving]);

  // Create a debounced save function that handles race conditions better
  const debouncedSave = useCallback(async (itemsToSave: RundownItem[], titleToSave: string, columnsToSave?: Column[], timezoneToSave?: string, startTimeToSave?: string, undoHistoryToSave?: any[]) => {
    if (!user) {
      console.log('Auto-save skipped: no user');
      return;
    }

    if (isSavingRef.current) {
      console.log('Auto-save: Save in progress, queuing new save');
      saveQueueRef.current = true;
      return;
    }

    console.log('Auto-save: Starting save operation with data:', {
      itemsCount: itemsToSave.length,
      title: titleToSave,
      undoHistoryLength: undoHistoryToSave?.length || 0
    });
    
    // Mark as loading to prevent change detection during save
    setIsLoading(true);

    try {
      const success = await performSave(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave, undoHistoryToSave);
      
      if (success) {
        console.log('Auto-save: Save successful');
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
        
        // If there was a queued save, schedule it
        if (saveQueueRef.current) {
          saveQueueRef.current = false;
          console.log('Auto-save: Processing queued save');
          setTimeout(() => {
            if (hasUnsavedChanges) {
              debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime, undoHistory ? [...undoHistory] : undefined);
            }
          }, 1000);
        }
      } else {
        console.log('Auto-save: Save failed');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
    }
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, hasUnsavedChanges, items, rundownTitle, columns, timezone, startTime, undoHistory]);

  // Main effect that schedules saves with better race condition handling
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Create a unique signature for this data
    const currentDataSignature = JSON.stringify({ 
      items: items.length, 
      title: rundownTitle, 
      columns: columns?.length || 0, 
      timezone, 
      startTime,
      undoHistory: undoHistory?.length || 0
    });
    
    // Only schedule if data actually changed
    if (lastSaveDataRef.current === currentDataSignature) {
      return;
    }

    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    console.log('Auto-save: Scheduling save in 2 seconds');

    // Schedule new save
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime, undoHistory ? [...undoHistory] : undefined);
      debounceTimeoutRef.current = null;
    }, 2000);

  }, [hasUnsavedChanges, isInitialized, user, items.length, rundownTitle, columns?.length, timezone, startTime, undoHistory?.length, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const markAsChangedCallback = () => {
    markAsChanged();
  };

  return {
    hasUnsavedChanges,
    isSaving,
    markAsChanged: markAsChangedCallback
  };
};
