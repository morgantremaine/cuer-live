import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

let globalInstanceCounter = 0;
const activeInstances = new Set<number>();

export const useAutoSave = (
  items: RundownItem[], 
  rundownTitle: string, 
  hasUnsavedChanges: boolean,
  markAsSaved: (items: RundownItem[], title: string, columns?: Column[], timezone?: string, startTime?: string) => void,
  columns?: Column[], 
  timezone?: string, 
  startTime?: string, 
  getUndoHistory?: () => any[]
) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const instanceIdRef = useRef<number>();
  const isUnmountedRef = useRef(false);
  
  // Store all current values in refs to avoid dependency issues
  const currentValuesRef = useRef({
    items,
    rundownTitle,
    hasUnsavedChanges,
    markAsSaved,
    columns,
    timezone,
    startTime,
    getUndoHistory,
    user
  });

  // Update refs on every render to keep them current
  currentValuesRef.current = {
    items,
    rundownTitle,
    hasUnsavedChanges,
    markAsSaved,
    columns,
    timezone,
    startTime,
    getUndoHistory,
    user
  };

  // Initialize instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++globalInstanceCounter;
    activeInstances.add(instanceIdRef.current);
    console.log(`🔧 useAutoSave instance #${instanceIdRef.current} created. Active instances:`, activeInstances.size);
  }

  const { isSaving, performSave } = useAutoSaveOperations();

  // Completely stable save function that uses refs
  const executeSave = useCallback(async () => {
    if (isUnmountedRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Skipping save - component unmounted`);
      return;
    }
    
    const current = currentValuesRef.current;
    
    if (!current.user || isSaving) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save blocked`, {
        hasUser: !!current.user,
        isSaving
      });
      return;
    }

    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Starting save operation`);

    try {
      const currentUndoHistory = current.getUndoHistory ? current.getUndoHistory() : undefined;
      
      const success = await performSave(
        current.items, 
        current.rundownTitle, 
        current.columns, 
        current.timezone, 
        current.startTime, 
        currentUndoHistory
      );
      
      if (success && !isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save successful`);
        current.markAsSaved(current.items, current.rundownTitle, current.columns, current.timezone, current.startTime);
      } else if (!isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save failed`);
      }
    } catch (error) {
      console.error(`🔧 Auto-save instance #${instanceIdRef.current}: Save error:`, error);
    }
  }, [performSave, isSaving]); // Only depend on stable values from useAutoSaveOperations

  // Main auto-save effect - ONLY depends on primitive values
  useEffect(() => {
    if (isUnmountedRef.current) return;

    console.log(`🔧 Auto-save instance #${instanceIdRef.current} effect:`, {
      hasUnsavedChanges,
      hasUser: !!user,
      currentTimeout: !!debounceTimeoutRef.current
    });

    // Only proceed if we have unsaved changes and a user
    if (!hasUnsavedChanges || !user) {
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
      if (!isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Timeout fired, executing save`);
        debounceTimeoutRef.current = null;
        executeSave();
      }
    }, 3000);

    // Cleanup function
    return () => {
      if (debounceTimeoutRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Effect cleanup - clearing timeout`);
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, user?.id]); // Only depend on primitive values that actually matter

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Component unmounted`);
      isUnmountedRef.current = true;
      activeInstances.delete(instanceIdRef.current!);
      console.log(`🔧 Remaining active instances:`, activeInstances.size);
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    isSaving
  };
};
