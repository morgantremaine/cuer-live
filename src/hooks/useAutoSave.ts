
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingSaveRef = useRef(false);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime);

  // Stable save function
  const executeSave = useCallback(async () => {
    if (!user || isSaving || isExecutingSaveRef.current) {
      console.log('Auto-save blocked:', { user: !!user, isSaving, isExecuting: isExecutingSaveRef.current });
      return;
    }

    isExecutingSaveRef.current = true;
    console.log('Auto-save: Starting save operation');
    
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
        console.log('Auto-save: Save completed successfully');
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
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
  }, [user, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, items, rundownTitle, columns, timezone, startTime, undoHistory, isSaving]);

  // Main auto-save effect
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user || isExecutingSaveRef.current) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    console.log('Auto-save: Scheduling save in 3 seconds');

    // Schedule new save with timeout reference
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
  }, [hasUnsavedChanges, isInitialized, user, executeSave]);

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
