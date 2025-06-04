
import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingSaveRef = useRef(false);
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

  // Create stable data snapshots to prevent infinite re-renders
  const stableItems = useMemo(() => JSON.stringify(items), [items]);
  const stableColumns = useMemo(() => JSON.stringify(columns), [columns]);
  const stableUndoHistory = useMemo(() => JSON.stringify(undoHistory), [undoHistory]);

  // Stable save function that won't change on every render
  const executeSave = useCallback(async () => {
    const now = Date.now();
    
    // Prevent duplicate saves within 1 second
    if (now - lastSaveAttemptRef.current < 1000) {
      console.log('Auto-save: Skipping duplicate save attempt');
      return;
    }
    
    if (!user || isSaving || isExecutingSaveRef.current) {
      console.log('Auto-save: Save blocked:', { 
        hasUser: !!user, 
        isSaving, 
        isExecuting: isExecutingSaveRef.current 
      });
      return;
    }

    lastSaveAttemptRef.current = now;
    isExecutingSaveRef.current = true;
    console.log('Auto-save: Starting save operation at', new Date().toISOString());
    
    setIsLoading(true);

    try {
      // Parse the stable data back to objects
      const itemsToSave = JSON.parse(stableItems);
      const columnsToSave = stableColumns ? JSON.parse(stableColumns) : undefined;
      const undoToSave = stableUndoHistory ? JSON.parse(stableUndoHistory) : undefined;
      
      const success = await performSave(
        itemsToSave, 
        rundownTitle, 
        columnsToSave, 
        timezone, 
        startTime, 
        undoToSave
      );
      
      if (success) {
        console.log('Auto-save: Save completed successfully at', new Date().toISOString());
        markAsSaved(itemsToSave, rundownTitle, columnsToSave, timezone, startTime);
      } else {
        console.log('Auto-save: Save failed');
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      isExecutingSaveRef.current = false;
    }
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, rundownTitle, timezone, startTime, stableItems, stableColumns, stableUndoHistory, isSaving]);

  // Main auto-save effect - only depends on change state and user
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    console.log('Auto-save: Scheduling save in 3 seconds');

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('Auto-save: Timeout reached, executing save');
      debounceTimeoutRef.current = null;
      executeSave();
    }, 3000);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, isInitialized, user?.id, executeSave]);

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
    isSaving: isSaving || isExecutingSaveRef.current,
    markAsChanged: () => markAsChanged()
  };
};
