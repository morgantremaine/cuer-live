
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
  const userTypingRef = useRef(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const { isSaving, performSave } = useAutoSaveOperations();
  const { 
    hasUnsavedChanges, 
    setHasUnsavedChanges, 
    markAsSaved, 
    markAsChanged,
    isInitialized,
    setIsLoading,
    setApplyingRemoteUpdate,
    updateSavedSignature,
    setUserTyping: setChangeTrackingUserTyping
  } = useChangeTracking(items, rundownTitle, columns, timezone, startTime, isProcessingRealtimeUpdate);

  // Enhanced user typing coordination
  const setUserTyping = useCallback((typing: boolean) => {
    userTypingRef.current = typing;
    setChangeTrackingUserTyping(typing);
    
    if (typing) {
      console.log('⌨️ User started typing - pausing auto-save');
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set timeout to clear typing state after user stops
      typingTimeoutRef.current = setTimeout(() => {
        userTypingRef.current = false;
        setChangeTrackingUserTyping(false);
        console.log('⌨️ User stopped typing - auto-save can resume');
      }, 2500); // 2.5 seconds after stopping typing
    }
  }, [setChangeTrackingUserTyping]);

  // Method to set showcaller active state
  const setShowcallerActive = useCallback((active: boolean) => {
    const wasActive = showcallerActiveRef.current;
    showcallerActiveRef.current = active;
    console.log('📺 Showcaller active state changed:', wasActive, '->', active);
  }, []);

  // Method to set undo active state
  const setUndoActive = useCallback((active: boolean) => {
    const wasActive = undoActiveRef.current;
    undoActiveRef.current = active;
    console.log('↩️ Undo active state changed:', wasActive, '->', active);
  }, []);

  // Enhanced debounced save function with better protection
  const debouncedSave = useCallback(async () => {
    // Enhanced checks to prevent unnecessary saves
    if (!user || 
        !isInitialized || 
        saveInProgressRef.current || 
        showcallerActiveRef.current ||
        undoActiveRef.current ||
        userTypingRef.current ||
        isProcessingRealtimeUpdate) {
      console.log('💾 Save skipped:', {
        user: !!user,
        initialized: isInitialized,
        saving: saveInProgressRef.current,
        showcaller: showcallerActiveRef.current,
        undo: undoActiveRef.current,
        typing: userTypingRef.current,
        realtime: isProcessingRealtimeUpdate
      });
      return;
    }

    // Create signature excluding showcaller-specific fields
    const currentDataSignature = JSON.stringify({
      items: (items || []).map(item => ({
        ...item,
        status: undefined,
        currentSegmentId: undefined
      })),
      title: rundownTitle || '',
      columns: columns || [],
      timezone: timezone || '',
      startTime: startTime || ''
    });

    // Skip if data hasn't actually changed
    if (currentDataSignature === lastSaveDataRef.current) {
      console.log('💾 Save skipped - no content changes detected');
      return;
    }

    // Prevent rapid successive saves - increased interval
    const now = Date.now();
    if (now - lastSaveTimestampRef.current < 2000) { // Increased from 1000ms
      console.log('💾 Save skipped - too soon after last save');
      return;
    }

    saveInProgressRef.current = true;
    lastSaveTimestampRef.current = now;

    try {
      console.log('💾 Starting debounced save...');
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
        console.log('✅ Debounced save completed successfully');
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      saveInProgressRef.current = false;
    }
  }, [user, items, rundownTitle, columns, timezone, startTime, performSave, markAsSaved, isInitialized, isProcessingRealtimeUpdate]);

  // Enhanced auto-save effect with longer debouncing
  useEffect(() => {
    if (!hasUnsavedChanges || 
        !isInitialized || 
        showcallerActiveRef.current || 
        undoActiveRef.current ||
        userTypingRef.current ||
        isProcessingRealtimeUpdate) {
      return;
    }

    // Clear existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Longer debounce times to prevent aggressive saving
    const delay = saveInProgressRef.current ? 5000 : 3000; // Increased delays
    console.log('💾 Auto-save scheduled in', delay, 'ms');
    
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
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
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
    setUndoActive,
    setUserTyping // Export for input components
  };
};
