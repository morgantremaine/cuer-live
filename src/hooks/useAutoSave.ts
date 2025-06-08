
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
    showcallerActiveRef.current = active;
    console.log('💾 Showcaller active state:', active);
  }, []);

  // Create a debounced save function that's stable across renders
  const debouncedSave = useCallback(async (
    itemsToSave: RundownItem[], 
    titleToSave: string, 
    columnsToSave?: Column[], 
    timezoneToSave?: string, 
    startTimeToSave?: string
  ) => {
    // ENHANCED: Check showcaller state and other blocking conditions
    if (!user || 
        isSaving || 
        isProcessingRealtimeUpdate || 
        saveInProgressRef.current ||
        showcallerActiveRef.current) {
      console.log('💾 Save blocked:', {
        noUser: !user,
        isSaving,
        isProcessingRealtimeUpdate,
        saveInProgress: saveInProgressRef.current,
        showcallerActive: showcallerActiveRef.current
      });
      return;
    }

    // Prevent rapid-fire saves with minimum interval
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 3000) {
      console.log('💾 Save throttled - too soon since last save');
      return;
    }

    console.log('💾 Auto-saving rundown...', { 
      itemCount: itemsToSave.length, 
      title: titleToSave 
    });

    // Mark as loading to prevent change detection during save
    setIsLoading(true);
    saveInProgressRef.current = true;
    lastSaveTimestampRef.current = now;

    try {
      const success = await performSave(
        itemsToSave, 
        titleToSave, 
        columnsToSave, 
        timezoneToSave, 
        startTimeToSave
      );
      
      if (success) {
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, startTimeToSave);
        console.log('✅ Auto-save successful');
      } else {
        setHasUnsavedChanges(true);
        console.log('❌ Auto-save failed');
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
    // ENHANCED: Multiple blocking conditions including showcaller
    if (isProcessingRealtimeUpdate || 
        saveInProgressRef.current || 
        showcallerActiveRef.current) {
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

    // Schedule new save with comprehensive checks
    debounceTimeoutRef.current = setTimeout(() => {
      // Final check when timeout fires
      if (!isProcessingRealtimeUpdate && 
          !saveInProgressRef.current && 
          !showcallerActiveRef.current) {
        debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);
      }
      debounceTimeoutRef.current = null;
    }, 2500); // Slightly longer debounce for stability

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
    if (!isProcessingRealtimeUpdate && 
        !saveInProgressRef.current && 
        !showcallerActiveRef.current) {
      markAsChanged();
    }
  };

  return {
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isSaving: isSaving || saveInProgressRef.current,
    markAsChanged: markAsChangedCallback,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setShowcallerActive
  };
};
