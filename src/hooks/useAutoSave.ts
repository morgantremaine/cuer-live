
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

  // Stable save function that captures current state when called
  const executeSave = useCallback(async () => {
    const now = Date.now();
    
    // Prevent duplicate saves within 1 second
    if (now - lastSaveAttemptRef.current < 1000) {
      return;
    }
    
    if (!user || isSaving || isExecutingSaveRef.current) {
      return;
    }

    lastSaveAttemptRef.current = now;
    isExecutingSaveRef.current = true;
    setIsLoading(true);

    try {
      const success = await performSave(
        items, 
        rundownTitle, 
        columns, 
        timezone, 
        startTime, 
        undoHistory
      );
      
      if (success) {
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      isExecutingSaveRef.current = false;
    }
  }, [user?.id, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, isSaving]);

  // Main auto-save effect - triggers when changes are detected
  useEffect(() => {
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
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
