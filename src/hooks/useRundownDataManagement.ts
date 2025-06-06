
import { useEffect, useRef } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { useAutoSave } from './useAutoSave';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownDataManagement = (rundownId: string) => {
  const isInitializedRef = useRef(false);
  const loadedRundownIdRef = useRef<string | null>(null);
  
  // Get basic state management
  const basicState = useRundownBasicState();
  
  // Initialize undo system
  const undoSystem = useRundownUndo();
  
  // Initialize storage
  const storage = useRundownStorage();
  
  // Initialize state integration
  const stateIntegration = useRundownStateIntegration(
    basicState.markAsChanged,
    basicState.rundownTitle,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.setRundownTitleDirectly,
    basicState.setTimezoneDirectly
  );

  // Data loading effect - simplified and fixed
  useEffect(() => {
    // Prevent loading if already initialized or storage is still loading
    if (isInitializedRef.current || storage.loading) {
      return;
    }

    // Prevent loading if we already loaded this rundown
    if (loadedRundownIdRef.current === rundownId) {
      return;
    }

    const savedRundowns = storage.savedRundowns;
    if (savedRundowns.length === 0) {
      return; // Wait for rundowns to load
    }

    basicState.setIsLoading(true);

    if (rundownId) {
      // Load existing rundown
      const rundown = savedRundowns.find(r => r.id === rundownId);
      if (rundown) {
        console.log('Loading existing rundown:', rundown.title);
        
        basicState.setRundownTitleDirectly(rundown.title);
        if (rundown.timezone) basicState.setTimezoneDirectly(rundown.timezone);
        if (rundown.start_time) basicState.setRundownStartTimeDirectly(rundown.start_time);
        if (rundown.columns) stateIntegration.handleLoadLayout(rundown.columns);
        if (rundown.items) stateIntegration.setItems(rundown.items);
        
        loadedRundownIdRef.current = rundownId;
      } else {
        console.log('Rundown not found, initializing new rundown');
        stateIntegration.setItems(defaultRundownItems);
        loadedRundownIdRef.current = null;
      }
    } else {
      // Initialize new rundown only if no items exist
      if (stateIntegration.items.length === 0) {
        console.log('Initializing new rundown');
        stateIntegration.setItems(defaultRundownItems);
      }
      loadedRundownIdRef.current = null;
    }

    setTimeout(() => {
      basicState.setIsLoading(false);
      isInitializedRef.current = true;
    }, 100);

  }, [rundownId, storage.loading, storage.savedRundowns.length]);

  // Reset when rundown ID changes
  useEffect(() => {
    if (loadedRundownIdRef.current !== rundownId) {
      isInitializedRef.current = false;
      loadedRundownIdRef.current = null;
    }
  }, [rundownId]);

  // Auto-save functionality
  const { isSaving, lastSavedTimestamp } = useAutoSave(
    rundownId,
    basicState.hasUnsavedChanges,
    stateIntegration.items,
    basicState.rundownTitle,
    stateIntegration.columns,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.markAsSaved,
    undoSystem.undoHistory
  );

  // Add missing properties for compatibility
  const clearRemoteUpdatesIndicator = () => {
    // No-op for now, can be implemented later if needed
  };

  return {
    ...basicState,
    ...storage,
    ...stateIntegration,
    ...undoSystem,
    isSaving,
    lastSavedTimestamp,
    isInitialized: isInitializedRef.current,
    hasRemoteUpdates: false, // Add missing property
    clearRemoteUpdatesIndicator // Add missing function
  };
};
