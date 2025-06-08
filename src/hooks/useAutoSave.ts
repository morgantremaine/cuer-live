
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

  // SIMPLIFIED: Method to set showcaller active state with reduced interference
  const setShowcallerActive = useCallback((active: boolean) => {
    const wasActive = showcallerActiveRef.current;
    showcallerActiveRef.current = active;
    
    // Only log changes, not every state
    if (wasActive !== active) {
      console.log('💾 Showcaller active state changed:', active);
    }
  }, []);

  // ENHANCED: Create a debounced save function with less restrictive blocking
  const debouncedSave = useCallback(async (
    itemsToSave: RundownItem[], 
    titleToSave: string, 
    columnsToSave?: Column[], 
    timezoneToSave?: string, 
    startTimeToSave?: string
  ) => {
    // SIMPLIFIED: Reduce blocking conditions - only block for critical states
    if (!user || 
        isSaving || 
        isProcessingRealtimeUpdate || 
        saveInProgressRef.current) {
      console.log('💾 Save blocked:', {
        noUser: !user,
        isSaving,
        isProcessingRealtimeUpdate,
        saveInProgress: saveInProgressRef.current
      });
      return;
    }

    // REDUCED: Showcaller activity only blocks for 2 seconds instead of full duration
    if (showcallerActiveRef.current) {
      const now = Date.now();
      if (now - lastSaveTimestampRef.current < 2000) {
        console.log('💾 Save briefly deferred due to showcaller activity');
        return;
      }
    }

    // REDUCED: Minimum interval between saves reduced to 2 seconds
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 2000) {
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

  // SIMPLIFIED: Main effect with reduced conflict detection
  useEffect(() => {
    // BASIC blocking for critical states only
    if (isProcessingRealtimeUpdate || saveInProgressRef.current) {
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

    // REDUCED: Schedule new save with shorter debounce for better responsiveness
    debounceTimeoutRef.current = setTimeout(() => {
      // Final check when timeout fires
      if (!isProcessingRealtimeUpdate && !saveInProgressRef.current) {
        debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, startTime);
      }
      debounceTimeoutRef.current = null;
    }, 1500); // Reduced from 2500ms to 1500ms

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

  // SIMPLIFIED: markAsChanged callback with reduced restrictions
  const markAsChangedCallback = () => {
    if (!isProcessingRealtimeUpdate && !saveInProgressRef.current) {
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
