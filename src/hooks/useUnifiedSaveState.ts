import { useState, useCallback, useRef, useEffect } from 'react';
import { debugLogger } from '@/utils/debugLogger';

export interface SaveState {
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSaved: Date | null;
  saveError: string | null;
  hasContentChanges?: boolean;
}

export interface SaveStateCallbacks {
  onSaveStart?: () => void;
  onSaveComplete?: (timestamp?: string) => void;
  onSaveError?: (error: string) => void;
  onUnsavedChanges?: () => void;
}

/**
 * UNIFIED save state management - single source of truth for all save states
 * Replaces multiple overlapping save state tracking systems
 */
export const useUnifiedSaveState = (callbacks?: SaveStateCallbacks) => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const isTypingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  
  // Unified logging for all save state changes
  const logStateChange = useCallback((change: string, details?: any) => {
    console.log(`🔄 UNIFIED SAVE STATE: ${change}`, details);
    debugLogger.autosave(`Unified save state: ${change}`, details);
  }, []);

  // Mark as having unsaved changes
  const markUnsavedChanges = useCallback(() => {
    if (!hasUnsavedChanges) {
      setHasUnsavedChanges(true);
      setSaveError(null);
      logStateChange('Marked as unsaved');
      callbacks?.onUnsavedChanges?.();
    }
  }, [hasUnsavedChanges, callbacks, logStateChange]);

  // Mark save as starting
  const markSaveStart = useCallback(() => {
    // Only show saving state if user isn't currently typing
    if (!isTypingRef.current) {
      setIsSaving(true);
    }
    setSaveError(null);
    logStateChange('Save started', { showingSaving: !isTypingRef.current, isTyping: isTypingRef.current });
    callbacks?.onSaveStart?.();
  }, [callbacks, logStateChange]);

  // Mark save as completed successfully  
  const markSaveComplete = useCallback((timestamp?: string) => {
    setIsSaving(false);
    
    // Only mark as saved if user isn't currently typing
    if (!isTypingRef.current) {
      setHasUnsavedChanges(false);
      setLastSaved(timestamp ? new Date(timestamp) : new Date());
    }
    setSaveError(null);
    logStateChange('Save completed', { 
      markedAsSaved: !isTypingRef.current, 
      isTyping: isTypingRef.current,
      timestamp 
    });
    callbacks?.onSaveComplete?.(timestamp);
  }, [callbacks, logStateChange]);

  // Mark save as failed
  const markSaveError = useCallback((error: string) => {
    setIsSaving(false);
    setSaveError(error);
    logStateChange('Save failed', { error });
    callbacks?.onSaveError?.(error);
  }, [callbacks, logStateChange]);

  // Track typing state to coordinate with save indicators
  const markTypingStart = useCallback(() => {
    const now = Date.now();
    lastTypingTimeRef.current = now;
    
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      logStateChange('Typing started');
      
      // Immediately show unsaved changes when typing starts
      markUnsavedChanges();
      
      // If currently saving, don't show saving state during typing
      if (isSaving) {
        setIsSaving(false);
        logStateChange('Hidden saving state due to typing');
      }
    }
  }, [isSaving, markUnsavedChanges, logStateChange]);

  const markTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      logStateChange('Typing stopped');
    }
  }, [logStateChange]);

  // Check if user is currently typing
  const isCurrentlyTyping = useCallback(() => {
    return isTypingRef.current && (Date.now() - lastTypingTimeRef.current < 1500);
  }, []);

  // Force reset state (for initialization)
  const resetSaveState = useCallback(() => {
    setIsSaving(false);
    setHasUnsavedChanges(false);
    setLastSaved(null);
    setSaveError(null);
    isTypingRef.current = false;
    logStateChange('State reset');
  }, [logStateChange]);

  // Computed save state object
  const saveState: SaveState = {
    isSaving: isSaving && !isCurrentlyTyping(), // Don't show saving if typing
    hasUnsavedChanges,
    lastSaved,
    saveError,
    hasContentChanges: hasUnsavedChanges
  };

  return {
    // State
    saveState,
    isSaving: saveState.isSaving,
    hasUnsavedChanges,
    lastSaved,
    saveError,
    
    // Actions
    markUnsavedChanges,
    markSaveStart,
    markSaveComplete,
    markSaveError,
    markTypingStart,
    markTypingStop,
    resetSaveState,
    
    // Utilities
    isCurrentlyTyping
  };
};