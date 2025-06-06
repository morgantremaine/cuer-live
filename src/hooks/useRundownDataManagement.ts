
import { useEffect, useRef } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { useAutoSave } from './useAutoSave';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownDataManagement = (rundownId: string) => {
  const isInitializedRef = useRef(false);
  
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

  // Simple data loading effect
  useEffect(() => {
    if (isInitializedRef.current || storage.loading) {
      return;
    }

    if (rundownId && storage.savedRundowns.length > 0) {
      // Load existing rundown
      const rundown = storage.savedRundowns.find(r => r.id === rundownId);
      if (rundown) {
        console.log('Loading existing rundown:', rundown.title);
        basicState.setIsLoading(true);
        
        basicState.setRundownTitleDirectly(rundown.title);
        if (rundown.timezone) basicState.setTimezoneDirectly(rundown.timezone);
        if (rundown.start_time) basicState.setRundownStartTimeDirectly(rundown.start_time);
        if (rundown.columns) stateIntegration.handleLoadLayout(rundown.columns);
        if (rundown.items) stateIntegration.setItems(rundown.items);
        
        setTimeout(() => {
          basicState.setIsLoading(false);
          isInitializedRef.current = true;
        }, 100);
      }
    } else if (!rundownId && storage.savedRundowns.length >= 0 && stateIntegration.items.length === 0) {
      // Initialize new rundown
      console.log('Initializing new rundown');
      basicState.setIsLoading(true);
      
      stateIntegration.setItems(defaultRundownItems);
      
      setTimeout(() => {
        basicState.setIsLoading(false);
        isInitializedRef.current = true;
      }, 100);
    }
  }, [rundownId, storage.loading, storage.savedRundowns.length, stateIntegration.items.length]);

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

  return {
    ...basicState,
    ...storage,
    ...stateIntegration,
    ...undoSystem,
    isSaving,
    lastSavedTimestamp,
    isInitialized: isInitializedRef.current
  };
};
