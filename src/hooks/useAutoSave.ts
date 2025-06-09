
import { useEffect, useRef, useCallback, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';

export const useAutoSave = (
  items: RundownItem[],
  rundownTitle: string,
  columns: Column[],
  timezone: string,
  rundownStartTime: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [applyingRemoteUpdate, setApplyingRemoteUpdate] = useState(false);
  
  const lastSavedSignature = useRef<string>('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialLoad = useRef(true);
  const saveStateOnSaveRef = useRef<((items: RundownItem[], columns: Column[], title: string, action: string) => void) | null>(null);

  // Get the auto-save operations
  const { performSave } = useAutoSaveOperations();

  // Create current state signature for comparison
  const createStateSignature = useCallback(() => {
    if (!Array.isArray(items) || !Array.isArray(columns)) {
      return '';
    }
    return JSON.stringify({
      items,
      rundownTitle,
      columns,
      timezone,
      rundownStartTime
    });
  }, [items, rundownTitle, columns, timezone, rundownStartTime]);

  // Create handleAutoSave function using performSave
  const handleAutoSave = useCallback(async (
    items: RundownItem[], 
    title: string, 
    columns: Column[], 
    timezone: string, 
    startTime: string
  ) => {
    setIsSaving(true);
    try {
      const success = await performSave(items, title, columns, timezone, startTime);
      if (success) {
        const newSignature = createStateSignature();
        lastSavedSignature.current = newSignature;
        setHasUnsavedChanges(false);
      }
    } finally {
      setIsSaving(false);
    }
  }, [performSave, createStateSignature]);

  // Create updateSavedSignature function
  const updateSavedSignature = useCallback(() => {
    const newSignature = createStateSignature();
    lastSavedSignature.current = newSignature;
    setHasUnsavedChanges(false);
  }, [createStateSignature]);

  // Allow external registration of undo save function
  const registerUndoSave = useCallback((saveFunction: (items: RundownItem[], columns: Column[], title: string, action: string) => void) => {
    saveStateOnSaveRef.current = saveFunction;
  }, []);

  // Create the trigger function that actually handles the auto-save logic
  const triggerAutoSave = useCallback(() => {
    console.log('🔥 triggerAutoSave called - processing auto-save logic');
    
    // Skip during initial load or when processing realtime updates
    if (isInitialLoad.current || isProcessingRealtimeUpdate || applyingRemoteUpdate) {
      console.log('🔥 Skipping auto-save - initial load or realtime update');
      return;
    }

    const currentSignature = createStateSignature();
    if (currentSignature === lastSavedSignature.current || !currentSignature) {
      console.log('🔥 Skipping auto-save - no changes detected');
      return;
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('🔄 Auto-saving rundown...');
        
        // Save undo state before auto-save
        if (saveStateOnSaveRef.current) {
          saveStateOnSaveRef.current(items, columns, rundownTitle, 'Auto-save');
        }
        
        await handleAutoSave(items, rundownTitle, columns, timezone, rundownStartTime);
        console.log('✅ Auto-save completed');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 2000); // 2 second delay
  }, [
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime,
    createStateSignature,
    handleAutoSave,
    isProcessingRealtimeUpdate,
    applyingRemoteUpdate
  ]);

  // Auto-save effect - this monitors for changes but doesn't trigger saves directly
  useEffect(() => {
    // Skip during initial load or when processing realtime updates
    if (isInitialLoad.current || isProcessingRealtimeUpdate || applyingRemoteUpdate) {
      return;
    }

    const currentSignature = createStateSignature();
    if (currentSignature === lastSavedSignature.current || !currentSignature) {
      return;
    }

    // Mark as having unsaved changes
    setHasUnsavedChanges(true);
  }, [
    items,
    rundownTitle,
    columns,
    timezone,
    rundownStartTime,
    createStateSignature,
    isProcessingRealtimeUpdate,
    applyingRemoteUpdate
  ]);

  // Mark initial load as complete after first render
  useEffect(() => {
    const timer = setTimeout(() => {
      console.log('🔥 Initial load completed - auto-save enabled');
      isInitialLoad.current = false;
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    hasUnsavedChanges,
    isSaving,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    registerUndoSave,
    triggerAutoSave // Export the trigger function
  };
};
