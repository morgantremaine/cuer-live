import { useCallback, useRef, useState } from 'react';

/**
 * Coordinates save state to prevent UI confusion during rapid edits.
 * Shows immediate "unsaved" state when typing starts, even during saves.
 */
export const useSaveStateCoordination = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const isTypingRef = useRef(false);
  const lastTypingTimeRef = useRef(0);
  
  // Track when user starts typing to immediately show unsaved state
  const onTypingStart = useCallback(() => {
    const now = Date.now();
    lastTypingTimeRef.current = now;
    
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      console.log('📝 Save coordination: typing started - showing unsaved state');
      
      // Immediately show unsaved changes when typing starts
      setHasUnsavedChanges(true);
      
      // If currently saving, cancel the saving state to show unsaved
      if (isSaving) {
        setIsSaving(false);
        console.log('🛑 Save coordination: cancelled saving state due to typing');
      }
      
      // Clear any save errors when user starts typing again
      if (saveError) {
        setSaveError(null);
      }
    }
  }, [isSaving, saveError]);
  
  // Track when user stops typing
  const onTypingStop = useCallback(() => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      console.log('⏸️ Save coordination: typing stopped');
    }
  }, []);
  
  // Called when save operation starts
  const onSaveStart = useCallback(() => {
    // Only show saving state if user isn't currently typing
    if (!isTypingRef.current) {
      setIsSaving(true);
      setSaveError(null);
      console.log('💾 Save coordination: save started');
    } else {
      console.log('⌨️ Save coordination: save started but user typing - keeping unsaved state');
    }
  }, []);
  
  // Called when save operation completes successfully
  const onSaveSuccess = useCallback((timestamp?: string) => {
    setIsSaving(false);
    
    // Only mark as saved if user isn't currently typing
    if (!isTypingRef.current) {
      setHasUnsavedChanges(false);
      setLastSaved(timestamp ? new Date(timestamp) : new Date());
      setSaveError(null);
      console.log('✅ Save coordination: save completed successfully');
    } else {
      console.log('⌨️ Save coordination: save completed but user still typing - keeping unsaved state');
    }
  }, []);
  
  // Called when save operation fails
  const onSaveError = useCallback((error: string) => {
    setIsSaving(false);
    setSaveError(error);
    console.log('❌ Save coordination: save failed -', error);
  }, []);
  
  // Check if user is currently typing (within last 1.5 seconds)
  const isCurrentlyTyping = useCallback(() => {
    return isTypingRef.current && (Date.now() - lastTypingTimeRef.current < 1500);
  }, []);
  
  // Force set unsaved state (for external changes)
  const markAsUnsaved = useCallback(() => {
    setHasUnsavedChanges(true);
    console.log('📝 Save coordination: manually marked as unsaved');
  }, []);
  
  // Force set saved state (for external changes)
  const markAsSaved = useCallback((timestamp?: string) => {
    setHasUnsavedChanges(false);
    setLastSaved(timestamp ? new Date(timestamp) : new Date());
    setSaveError(null);
    console.log('✅ Save coordination: manually marked as saved');
  }, []);
  
  return {
    // State
    isSaving: isSaving && !isCurrentlyTyping(), // Don't show saving if typing
    hasUnsavedChanges,
    lastSaved,
    saveError,
    
    // Actions
    onTypingStart,
    onTypingStop,
    onSaveStart,
    onSaveSuccess,
    onSaveError,
    markAsUnsaved,
    markAsSaved,
    
    // Utilities
    isCurrentlyTyping
  };
};