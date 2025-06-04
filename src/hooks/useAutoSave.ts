
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
  const effectRunCountRef = useRef(0);

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
    
    console.log('Auto-save: executeSave called at', new Date().toISOString());
    
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
      const success = await performSave(
        items, 
        rundownTitle, 
        columns, 
        timezone, 
        startTime, 
        undoHistory
      );
      
      if (success) {
        console.log('Auto-save: Save completed successfully at', new Date().toISOString());
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
  }, [user?.id, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, isSaving]);

  // Main auto-save effect - triggers when changes are detected
  useEffect(() => {
    effectRunCountRef.current += 1;
    const runNumber = effectRunCountRef.current;
    
    console.log(`Auto-save effect run #${runNumber}:`, {
      hasUnsavedChanges,
      isInitialized,
      hasUser: !!user,
      currentTimeout: !!debounceTimeoutRef.current
    });

    if (!hasUnsavedChanges || !isInitialized || !user) {
      console.log(`Auto-save effect #${runNumber}: Early return - conditions not met`);
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      console.log(`Auto-save effect #${runNumber}: Clearing existing timeout`);
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    console.log(`Auto-save effect #${runNumber}: Scheduling save in 3 seconds`);

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`Auto-save effect #${runNumber}: Timeout reached, executing save`);
      debounceTimeoutRef.current = null;
      executeSave();
    }, 3000);

    // Cleanup function
    return () => {
      console.log(`Auto-save effect #${runNumber}: Cleanup called`);
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
