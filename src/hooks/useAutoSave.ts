
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

// Add a global counter to track hook instances
let hookInstanceCounter = 0;

export const useAutoSave = (items: RundownItem[], rundownTitle: string, columns?: Column[], timezone?: string, startTime?: string, undoHistory?: any[]) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingSaveRef = useRef(false);
  const lastSaveAttemptRef = useRef<number>(0);
  const instanceIdRef = useRef<number>();

  // Assign instance ID only once
  if (!instanceIdRef.current) {
    instanceIdRef.current = ++hookInstanceCounter;
    console.log(`🔧 useAutoSave instance #${instanceIdRef.current} created`);
  }

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
    
    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: executeSave called at`, new Date().toISOString());
    
    // Prevent duplicate saves within 1 second
    if (now - lastSaveAttemptRef.current < 1000) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Skipping duplicate save attempt`);
      return;
    }
    
    if (!user || isSaving || isExecutingSaveRef.current) {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save blocked:`, { 
        hasUser: !!user, 
        isSaving, 
        isExecuting: isExecutingSaveRef.current 
      });
      return;
    }

    lastSaveAttemptRef.current = now;
    isExecutingSaveRef.current = true;
    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Starting save operation at`, new Date().toISOString());
    
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
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save completed successfully at`, new Date().toISOString());
        markAsSaved(items, rundownTitle, columns, timezone, startTime);
      } else {
        console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Save failed`);
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error(`🔧 Auto-save instance #${instanceIdRef.current} error:`, error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      isExecutingSaveRef.current = false;
    }
  }, [user?.id, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, isSaving]);

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

    console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Scheduling save in 3 seconds`);

    // Set new timeout
    debounceTimeoutRef.current = setTimeout(() => {
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: Timeout reached, executing save`);
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
      console.log(`🔧 Auto-save instance #${instanceIdRef.current}: UNMOUNTING`);
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
