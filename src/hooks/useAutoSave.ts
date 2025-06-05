
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
  const isInitializedRef = useRef(false);

  // Initialize instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++globalInstanceCounter;
    activeInstances.add(instanceIdRef.current);
    console.log(`🔧 useAutoSave instance #${instanceIdRef.current} created. Active instances:`, activeInstances.size);
  }

  const { isSaving, performSave } = useAutoSaveOperations();

  // Stable save function that captures current state when called
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

    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Starting save operation`);

    try {
      const currentUndoHistory = getUndoHistory ? getUndoHistory() : undefined;
      
      const success = await performSave(
        items, 
        rundownTitle, 
        columns, 
        timezone, 
        startTime, 
        currentUndoHistory
      );
      
      if (success && !isUnmountedRef.current) {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save successful`);
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
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
  }, [user, performSave, markAsSaved, isSaving, items, rundownTitle, columns, timezone, startTime, getUndoHistory]);

  // Main auto-save effect - triggers when changes are detected
  useEffect(() => {
    if (isUnmountedRef.current) return;

    // Initialize only once per instance
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Initialized`);
    }

    console.log(`🔧 Auto-save instance #${instanceIdRef.current} effect:`, {
      hasUnsavedChanges,
      hasUser: !!user,
      currentTimeout: !!debounceTimeoutRef.current
    });

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
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Cleanup - clearing timeout`);
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
    };
  }, [hasUnsavedChanges, user, executeSave]);

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
