
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
  const isExecutingSaveRef = useRef(false);
  const lastSaveAttemptRef = useRef<number>(0);
  const instanceIdRef = useRef<number>();
  const isUnmountedRef = useRef(false);
  const hasUnsavedChangesRef = useRef(hasUnsavedChanges);
  const userRef = useRef(user);
  
  // Update refs immediately when values change
  hasUnsavedChangesRef.current = hasUnsavedChanges;
  userRef.current = user;
  
  // Store latest values in refs to avoid dependency issues
  const latestValuesRef = useRef({
    items,
    rundownTitle,
    columns,
    timezone,
    startTime,
    getUndoHistory,
    markAsSaved
  });

  // Update refs whenever values change
  latestValuesRef.current = {
    items,
    rundownTitle,
    columns,
    timezone,
    startTime,
    getUndoHistory,
    markAsSaved
  };

  // Initialize instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++globalInstanceCounter;
    activeInstances.add(instanceIdRef.current);
    console.log(`🔧 useAutoSave instance #${instanceIdRef.current} created. Active instances:`, activeInstances.size);
  }

  const { isSaving, performSave } = useAutoSaveOperations();

  // Stable save function that uses refs to get current values
  const executeSave = useCallback(async () => {
    if (isUnmountedRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Skipping save - component unmounted`);
      return;
    }
    
    const now = Date.now();
    
    // Prevent duplicate saves within 1 second
    if (now - lastSaveAttemptRef.current < 1000) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save throttled`);
      return;
    }
    
    if (!userRef.current || isSaving || isExecutingSaveRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save blocked`, {
        hasUser: !!userRef.current,
        isSaving,
        isExecuting: isExecutingSaveRef.current
      });
      return;
    }

    lastSaveAttemptRef.current = now;
    isExecutingSaveRef.current = true;

    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Starting save operation`);

    try {
      const {
        items: currentItems,
        rundownTitle: currentTitle,
        columns: currentColumns,
        timezone: currentTimezone,
        startTime: currentStartTime,
        getUndoHistory: currentGetUndoHistory,
        markAsSaved: currentMarkAsSaved
      } = latestValuesRef.current;

      const currentUndoHistory = currentGetUndoHistory ? currentGetUndoHistory() : undefined;
      
      const success = await performSave(
        currentItems, 
        currentTitle, 
        currentColumns, 
        currentTimezone, 
        currentStartTime, 
        currentUndoHistory
      );
      
      if (success && !isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save successful`);
        currentMarkAsSaved(currentItems, currentTitle, currentColumns, currentTimezone, currentStartTime);
      } else if (!isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save failed`);
      }
    } catch (error) {
      console.error(`🔧 Auto-save instance #${instanceIdRef.current}: Save error:`, error);
    } finally {
      if (!isUnmountedRef.current) {
        isExecutingSaveRef.current = false;
      }
    }
  }, [performSave, isSaving]);

  // Main auto-save effect - ONLY depends on stable values
  useEffect(() => {
    if (isUnmountedRef.current) return;

    console.log(`🔧 Auto-save instance #${instanceIdRef.current} effect:`, {
      hasUnsavedChanges: hasUnsavedChangesRef.current,
      hasUser: !!userRef.current,
      currentTimeout: !!debounceTimeoutRef.current
    });

    if (!hasUnsavedChangesRef.current || !userRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Early return - conditions not met`);
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Effect cleanup - clearing timeout`);
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
  }, [hasUnsavedChanges, user, executeSave]); // Only depend on the actual primitive values that matter

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
    isSaving: isSaving || isExecutingSaveRef.current
  };
};
