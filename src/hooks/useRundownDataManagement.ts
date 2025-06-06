
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
  const hasLoadedRundownsRef = useRef(false);
  
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

  // Data loading effect - completely rewritten to fix the loop
  useEffect(() => {
    // Only proceed if we have rundowns loaded and haven't initialized yet
    if (storage.loading || !storage.savedRundowns || storage.savedRundowns.length === 0) {
      return;
    }

    // Mark that we have rundowns available
    if (!hasLoadedRundownsRef.current) {
      hasLoadedRundownsRef.current = true;
      console.log('Rundowns loaded, count:', storage.savedRundowns.length);
    }

    // Don't re-initialize if we're already done
    if (isInitializedRef.current && loadedRundownIdRef.current === rundownId) {
      return;
    }

    console.log('Attempting to load rundown:', rundownId);
    basicState.setIsLoading(true);

    if (rundownId) {
      // Try to load existing rundown
      const rundown = storage.savedRundowns.find(r => r.id === rundownId);
      if (rundown) {
        console.log('Loading existing rundown:', rundown.title);
        
        // Load all rundown data
        basicState.setRundownTitleDirectly(rundown.title);
        if (rundown.timezone) basicState.setTimezoneDirectly(rundown.timezone);
        if (rundown.start_time) basicState.setRundownStartTimeDirectly(rundown.start_time);
        if (rundown.columns) stateIntegration.handleLoadLayout(rundown.columns);
        if (rundown.items && rundown.items.length > 0) {
          stateIntegration.setItems(rundown.items);
        } else {
          // If rundown exists but has no items, initialize with defaults
          stateIntegration.setItems(defaultRundownItems);
        }
        
        loadedRundownIdRef.current = rundownId;
        console.log('Successfully loaded rundown with', rundown.items?.length || 0, 'items');
      } else {
        console.log('Rundown not found, initializing with defaults');
        stateIntegration.setItems(defaultRundownItems);
        loadedRundownIdRef.current = null;
      }
    } else {
      // No rundown ID - initialize new rundown only if no items exist
      if (stateIntegration.items.length === 0) {
        console.log('Initializing new rundown with defaults');
        stateIntegration.setItems(defaultRundownItems);
      }
      loadedRundownIdRef.current = null;
    }

    // Complete initialization
    setTimeout(() => {
      basicState.setIsLoading(false);
      isInitializedRef.current = true;
      console.log('Data management initialization complete');
    }, 100);

  }, [rundownId, storage.savedRundowns.length, hasLoadedRundownsRef.current]);

  // Reset when rundown ID changes
  useEffect(() => {
    if (loadedRundownIdRef.current !== rundownId) {
      console.log('Rundown ID changed, resetting initialization');
      isInitializedRef.current = false;
      loadedRundownIdRef.current = null;
      hasLoadedRundownsRef.current = false;
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
