
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string) => {
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
  } = useChangeTracking(items, rundownTitle, columns);

  // Create a debounced save function that's stable across renders
  const debouncedSave = useCallback(async (itemsToSave: RundownItem[], titleToSave: string, columnsToSave?: Column[], timezoneToSave?: string) => {
    if (!user || isSaving) {
      return;
    }

    console.log('Auto-save: Starting save with timezone:', timezoneToSave);

    // Mark as loading to prevent change detection during save
    setIsLoading(true);

    try {
      const success = await performSave(itemsToSave, titleToSave, columnsToSave, timezoneToSave);
      
      if (success) {
        console.log('Auto-save: Save successful, marking as saved');
        markAsSaved(itemsToSave, titleToSave, columnsToSave);
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
  }, [user, isSaving, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading]);

  // Main effect that schedules saves
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Create a unique signature for this data
    const currentDataSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone });
    
    console.log('Auto-save: Checking if data changed. Current timezone:', timezone);
    
    // Only schedule if data actually changed
    if (lastSaveDataRef.current === currentDataSignature) {
      console.log('Auto-save: Data signature unchanged, skipping save');
      return;
    }

    console.log('Auto-save: Data changed, scheduling save with timezone:', timezone);
    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule new save
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('Auto-save: Executing save with timezone:', timezone);
      debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone);
      debounceTimeoutRef.current = null;
    }, 2000);

  }, [hasUnsavedChanges, isInitialized, user, items, rundownTitle, columns, timezone, debouncedSave]);

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
