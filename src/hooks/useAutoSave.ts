
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

let instanceCounter = 0;

export const useAutoSave = (
  items: RundownItem[], 
  rundownTitle: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string, 
  getUndoHistory?: () => any[]
) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingSaveRef = useRef(false);
  const lastSaveAttemptRef = useRef<number>(0);
  const instanceIdRef = useRef(++instanceCounter);

  console.log(`🔧 useAutoSave instance #${instanceIdRef.current} created`);

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
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save throttled`);
      return;
    }
    
    if (!user || isSaving || isExecutingSaveRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save blocked`, {
        hasUser: !!user,
        isSaving,
        isExecuting: isExecutingSaveRef.current
      });
      return;
    }

    lastSaveAttemptRef.current = now;
    isExecutingSaveRef.current = true;
    setIsLoading(true);

    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Starting save operation`);

    try {
      // Get current undo history if function is provided
      const currentUndoHistory = getUndoHistory ? getUndoHistory() : undefined;
      
      const success = await performSave(
        items, 
        rundownTitle, 
        columns, 
        timezone, 
        startTime, 
        currentUndoHistory
      );
      
      if (success) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save successful`);
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
      } else {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save failed`);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error(`🔧 Auto-save instance #${instanceIdRef.current}: Save error:`, error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      isExecutingSaveRef.current = false;
    }
  }, [user?.id, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, isSaving, items, rundownTitle, columns, timezone, startTime, getUndoHistory]);

  // Main auto-save effect - triggers when changes are detected
  useEffect(() => {
    console.log(`🔧 Auto-save instance #${instanceIdRef.current} effect:`, {
      hasUnsavedChanges,
      isInitialized,
      hasUser: !!user,
      currentTimeout: !!debounceTimeoutRef.current
    });

    if (!hasUnsavedChanges || !isInitialized || !user) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Early return - conditions not met`);
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Clearing existing timeout`);
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    // Set new timeout
    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Scheduling save in 3 seconds`);
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Timeout fired, executing save`);
      debounceTimeoutRef.current = null;
      executeSave();
    }, 3000);

    // Cleanup function
    return () => {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Cleanup called`);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, isInitialized, user?.id, executeSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Component unmounted`);
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
