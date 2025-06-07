
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

  // Create a debounced save function that's stable across renders
  const debouncedSave = useCallback(async (
    itemsToSave: RundownItem[], 
    titleToSave: string, 
    columnsToSave?: Column[], 
    timezoneToSave?: string, 
    startTimeToSave?: string
  ) => {
    // CRITICAL: Enhanced blocking conditions
    if (!user || 
        isSaving || 
        isProcessingRealtimeUpdate || 
        saveInProgressRef.current) {
      console.log('💾 Blocking auto-save:', { 
        noUser: !user, 
        isSaving, 
        isProcessingRealtimeUpdate,
        saveInProgress: saveInProgressRef.current
      });
      return;
    }

    // Prevent rapid-fire saves with minimum interval
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 1000) {
      console.log('💾 Blocking auto-save - too soon since last save');
      return;
    }

    // Mark as loading to prevent change detection during save
    setIsLoading(true);
    saveInProgressRef.current = true;
    lastSaveTimestampRef.current = now;

    try {
      console.log('💾 Performing auto-save...');
      const success = await performSave(
        itemsToSave, 
        titleToSave, 
        columnsToSave, 
        timezoneToSave, 
        startTimeToSave
      );
      
      if (success) {
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
      } else {
        setHasUnsavedChanges(true);
      }
    } catch (error) {
      console.error('Auto-save error:', error);
      setHasUnsavedChanges(true);
    } finally {
      setIsLoading(false);
      saveInProgressRef.current = false;
    }
  }, [user, isSaving, isProcessingRealtimeUpdate, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading]);

  // Main effect that schedules saves with enhanced protection
  useEffect(() => {
    // CRITICAL: Multiple blocking conditions
    if (isProcessingRealtimeUpdate || saveInProgressRef.current) {
      console.log('🛑 Blocking auto-save scheduling - realtime update or save in progress');
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    // Don't auto-save if not ready
    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Create a unique signature for this data
    const currentDataSignature = JSON.stringify({ items, title: rundownTitle, columns, timezone, startTime });
    
    // Only schedule if data actually changed
    if (lastSaveDataRef.current === currentDataSignature) {
      return;
    }

    lastSaveDataRef.current = currentDataSignature;

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Schedule new save with additional checks
    console.log('⏰ Scheduling auto-save in 3 seconds...');
    debounceTimeoutRef.current = setTimeout(() => {
      // Final comprehensive check when timeout fires
      if (!isProcessingRealtimeUpdate && !saveInProgressRef.current) {
        console.log('🚀 Executing scheduled auto-save');
        debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);
      } else {
        console.log('🛑 Aborting scheduled auto-save - blocking conditions detected');
      }
      debounceTimeoutRef.current = null;
    }, 3000); // Increased to 3 seconds for better stability

  }, [
    hasUnsavedChanges, 
    isInitialized, 
    user, 
    items, 
    rundownTitle, 
    columns, 
    timezone, 
    startTime, 
    debouncedSave, 
    isProcessingRealtimeUpdate
  ]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  const markAsChangedCallback = () => {
    if (!isProcessingRealtimeUpdate && !saveInProgressRef.current) {
      console.log('✏️ Marking as changed (not during realtime update or save)');
      markAsChanged();
    } else {
      console.log('🚫 Blocking mark as changed - realtime update or save in progress');
    }
  };

  return {
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isSaving: isSaving || saveInProgressRef.current,
    markAsChanged: markAsChangedCallback,
    setApplyingRemoteUpdate,
    updateSavedSignature
  };
};
