
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isSavingRef = useRef(false);
  const saveQueueRef = useRef<boolean>(false);
  const isProcessingSaveRef = useRef(false);

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

  // Stable save function that doesn't change on every render
  const executeSave = useCallback(async () => {
    if (!user || isSavingRef.current || isProcessingSaveRef.current) {
      console.log('Auto-save skipped: no user or already saving');
      return;
    }

    if (saveQueueRef.current) {
      console.log('Auto-save: Save already queued, skipping duplicate');
      return;
    }

    isProcessingSaveRef.current = true;
    console.log('Auto-save: Executing save operation');
    
    // Mark as loading to prevent change detection during save
    setIsLoading(true);

    try {
      const success = await performSave(
        [...items], 
        rundownTitle, 
        columns ? [...columns] : undefined, 
        timezone, 
        startTime, 
        undoHistory ? [...undoHistory] : undefined
      );
      
      if (success) {
        console.log('Auto-save: Save successful');
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
        saveQueueRef.current = false;
      } else {
        console.log('Auto-save: Save failed');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      isProcessingSaveRef.current = false;
    }
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, items, rundownTitle, columns, timezone, startTime, undoHistory]);

  // Main effect that schedules saves
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user || isProcessingSaveRef.current) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    console.log('Auto-save: Scheduling save in 3 seconds');

    // Schedule new save
    debounceTimeoutRef.current = setTimeout(() => {
      executeSave();
      debounceTimeoutRef.current = null;
    }, 3000);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, isInitialized, user, executeSave]);

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
