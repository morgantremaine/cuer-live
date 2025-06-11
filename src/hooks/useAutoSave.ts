
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
    
    if (wasActive !== active) {
      console.log('💾 Showcaller active state changed:', active);
    }
  }, []);

  // Method to coordinate with undo operations
  const setUndoActive = useCallback((active: boolean) => {
    const wasActive = undoActiveRef.current;
    undoActiveRef.current = active;
    
    if (wasActive !== active) {
      console.log('💾 Undo active state changed:', active);
    }
  }, []);

  // Validate start time before saving
  const validateStartTime = useCallback((timeString?: string): string => {
    if (!timeString) return '09:00:00';
    
    // Remove any non-time characters
    let cleanTime = timeString.replace(/[^0-9:]/g, '');
    
    // Ensure proper format HH:MM:SS
    const timeParts = cleanTime.split(':');
    if (timeParts.length === 3) {
      const hours = Math.min(23, Math.max(0, parseInt(timeParts[0]) || 0)).toString().padStart(2, '0');
      const minutes = Math.min(59, Math.max(0, parseInt(timeParts[1]) || 0)).toString().padStart(2, '0');
      const seconds = Math.min(59, Math.max(0, parseInt(timeParts[2]) || 0)).toString().padStart(2, '0');
      return `${hours}:${minutes}:${seconds}`;
    }
    
    return '09:00:00';
  }, []);

  // Create a debounced save function with undo coordination
  const debouncedSave = useCallback(async (
    itemsToSave: RundownItem[], 
    titleToSave: string, 
    columnsToSave?: Column[], 
    timezoneToSave?: string, 
    startTimeToSave?: string
  ) => {
    if (!user || 
        isSaving || 
        isProcessingRealtimeUpdate || 
        saveInProgressRef.current ||
        undoActiveRef.current) { // Don't save during undo operations
      console.log('💾 Save blocked:', {
        noUser: !user,
        isSaving,
        isProcessingRealtimeUpdate,
        saveInProgress: saveInProgressRef.current,
        undoActive: undoActiveRef.current
      });
      return;
    }

    // Brief showcaller activity blocking
    if (showcallerActiveRef.current) {
      const now = Date.now();
      if (now - lastSaveTimestampRef.current < 2000) {
        console.log('💾 Save briefly deferred due to showcaller activity');
        return;
      }
    }

    // Minimum interval between saves
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 1500) {
      console.log('💾 Save throttled - too soon since last save');
      return;
    }

    // Validate the start time before saving
    const validatedStartTime = validateStartTime(startTimeToSave);
    
    console.log('💾 Auto-saving rundown...', { 
      itemCount: itemsToSave.length, 
      title: titleToSave,
      timezone: timezoneToSave,
      startTime: validatedStartTime 
    });

    setIsLoading(true);
    saveInProgressRef.current = true;
    lastSaveTimestampRef.current = now;

    try {
      const success = await performSave(
        itemsToSave, 
        titleToSave, 
        columnsToSave, 
        timezoneToSave, 
        validatedStartTime
      );
      
      if (success) {
        markAsSaved(itemsToSave, titleToSave, columnsToSave, timezoneToSave, validatedStartTime);
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
  }, [user, isSaving, isProcessingRealtimeUpdate, performSave, markAsSaved, setHasUnsavedChanges, setIsLoading, validateStartTime]);

  // Main effect for auto-save with undo coordination
  useEffect(() => {
    if (isProcessingRealtimeUpdate || saveInProgressRef.current || undoActiveRef.current) {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      return;
    }

    if (!hasUnsavedChanges || !isInitialized || !user) {
      return;
    }

    // Validate start time in the signature
    const validatedStartTime = validateStartTime(startTime);
    
    const currentDataSignature = JSON.stringify({ 
      items, 
      title: rundownTitle, 
      columns, 
      timezone, 
      startTime: validatedStartTime 
    });
    
    if (lastSaveDataRef.current === currentDataSignature) {
      return;
    }

    console.log('💾 Data changed, scheduling save with current values:', {
      timezone,
      startTime: validatedStartTime,
      title: rundownTitle,
      itemCount: items.length
    });

    lastSaveDataRef.current = currentDataSignature;

    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      if (!isProcessingRealtimeUpdate && !saveInProgressRef.current && !undoActiveRef.current) {
        console.log('💾 Executing save with values:', {
          timezone,
          startTime: validatedStartTime,
          title: rundownTitle
        });
        debouncedSave([...items], rundownTitle, columns ? [...columns] : undefined, timezone, validatedStartTime);
      }
      debounceTimeoutRef.current = null;
    }, 1500);

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
    isProcessingRealtimeUpdate,
    validateStartTime
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
    if (!isProcessingRealtimeUpdate && !saveInProgressRef.current && !undoActiveRef.current) {
      markAsChanged();
    }
  };

  return {
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isSaving: isSaving || saveInProgressRef.current,
    markAsChanged: markAsChangedCallback,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setShowcallerActive,
    setUndoActive // Export for undo coordination
  };
};
