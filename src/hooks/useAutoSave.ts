
import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { RundownItem } from './useRundownItems';
import { Column } from './useColumnsManager';
import { useAutoSaveOperations } from './useAutoSaveOperations';
import { useChangeTracking } from './useChangeTracking';

export const useAutoSave = (
  items: RundownItem[], 
  rundownTitle: string, 
  columns?: Column[], 
  timezone?: string, 
  startTime?: string,
  isProcessingRealtimeUpdate?: boolean
) => {
  const { user } = useAuth();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveDataRef = useRef<string>('');
  const saveInProgressRef = useRef(false);
  const lastSaveTimestampRef = useRef<number>(0);
  const showcallerActiveRef = useRef(false);
  const undoActiveRef = useRef(false);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading,
    setApplyingRemoteUpdate,
    updateSavedSignature
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime, isProcessingRealtimeUpdate);

  // Method to set showcaller active state
  const setShowcallerActive = useCallback((active: boolean) => {
    const wasActive = showcallerActiveRef.current;
    showcallerActiveRef.current = active;
  }, []);

  // Method to set undo active state
  const setUndoActive = useCallback((active: boolean) => {
    const wasActive = undoActiveRef.current;
    undoActiveRef.current = active;
  }, []);

  // Debounced save function with multiple layers of protection
  const debouncedSave = useCallback(async () => {
    // Multiple checks to prevent unnecessary saves
    if (!user || 
        !isInitialized || 
        saveInProgressRef.current || 
        showcallerActiveRef.current ||
        undoActiveRef.current ||
        isProcessingRealtimeUpdate) {
      return;
    }

    const currentDataSignature = JSON.stringify({
      items: items || [],
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });

    // Skip if data hasn't actually changed
    if (currentDataSignature === lastSaveDataRef.current) {
      return;
    }

    // Prevent rapid successive saves
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 1000) {
      return;
    }

    saveInProgressRef.current = true;
    lastSaveTimestampRef.current = now;

    try {
      const saveSuccess = await performSave(
        items || [], 
        rundownTitle || '', 
        columns, 
        timezone, 
        startTime
      );
      
      if (saveSuccess) {
        lastSaveDataRef.current = currentDataSignature;
        markAsSaved(items || [], rundownTitle || '', columns, timezone, startTime);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [user, items, rundownTitle, columns, timezone, startTime, performSave, markAsSaved, isInitialized, isProcessingRealtimeUpdate]);

  // Auto-save effect with intelligent debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || 
        !isInitialized || 
        showcallerActiveRef.current || 
        undoActiveRef.current ||
        isProcessingRealtimeUpdate) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Set new timeout with smart delay
    const delay = saveInProgressRef.current ? 3000 : 1500;
    debounceTimeoutRef.current = setTimeout(() => {
      debouncedSave();
    }, delay);

    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [hasUnsavedChanges, debouncedSave, isInitialized, isProcessingRealtimeUpdate]);

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
    setHasUnsavedChanges,
    markAsSaved,
    markAsChanged,
    isSaving,
    setIsLoading,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setShowcallerActive,
    setUndoActive
  };
};

