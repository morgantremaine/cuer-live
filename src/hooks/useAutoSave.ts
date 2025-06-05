
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const saveInProgressRef = useRef(false);
  const lastSaveAttemptRef = useRef<number>(0);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime);

  // Debounced save function
  const debouncedSave = useCallback(async (itemsToSave: RundownItem[], titleToSave: string, columnsToSave?: Column[], timezoneToSave?: string, startTimeToSave?: string) => {
    const now = Date.now();
    
    // Rate limiting - prevent saves within 3 seconds of each other
    if (now - lastSaveAttemptRef.current < 3000) {
      console.log('Save rate limited, skipping');
      return;
    }

    if (!user || saveInProgressRef.current) {
      console.log('Save blocked - no user or save in progress');
      return;
    }

    // Validate we have data to save
    if (!Array.isArray(itemsToSave) || itemsToSave.length === 0) {
      console.log('Save blocked - no items to save');
      return;
    }

    saveInProgressRef.current = true;
    setIsLoading(true);
    lastSaveAttemptRef.current = now;

    console.log('Starting auto-save for:', titleToSave, 'with', itemsToSave.length, 'items');

    try {
      const success = await performSave(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      
      if (success) {
        console.log('Auto-save successful');
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      } else {
        console.log('Auto-save failed');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      saveInProgressRef.current = false;
    }
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading]);

  // Auto-save effect - SIMPLIFIED to prevent infinite loops
  useEffect(() => {
    // Clear any existing timeout first
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Only attempt save if we have unsaved changes and are initialized
    if (!hasUnsavedChanges || !isInitialized || !user || saveInProgressRef.current) {
      return;
    }

    // Don't save if we don't have meaningful data
    if (!Array.isArray(items) || items.length === 0) {
      console.log('Skipping save - no items');
      return;
    }

    console.log('Executing auto-save immediately for changes');
    
    // Execute save immediately instead of scheduling
    debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);

  }, [hasUnsavedChanges, isInitialized, user, items, rundownTitle, columns, timezone, startTime, debouncedSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving: isSaving || saveInProgressRef.current,
    markAsChanged
  };
};
