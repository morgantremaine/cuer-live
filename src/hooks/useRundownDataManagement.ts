
import { useEffect } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownDataLoader } from './useRundownDataLoader';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownDataManagement = (rundownId: string) => {
  // Get basic state management
  const basicState = useRundownBasicState();
  
  // Initialize undo system
  const undoSystem = useRundownUndo();
  
  // Initialize storage
  const storage = useRundownStorage();
  
  // Initialize state integration with all required parameters
  const stateIntegration = useRundownStateIntegration(
    basicState.markAsChanged,
    basicState.rundownTitle,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.setRundownTitleDirectly,
    basicState.setTimezoneDirectly
  );

  // Use the data loader to handle loading rundowns from storage
  useRundownDataLoader({
    rundownId,
    savedRundowns: storage.savedRundowns,
    loading: storage.loading,
    setRundownTitle: basicState.setRundownTitleDirectly,
    setTimezone: basicState.setTimezoneDirectly,
    setRundownStartTime: basicState.setRundownStartTimeDirectly,
    handleLoadLayout: stateIntegration.handleLoadLayout,
    setItems: stateIntegration.setItems,
    onRundownLoaded: (rundown) => {
      console.log('Rundown loaded successfully:', rundown.title);
    }
  });

  // Initialize with default items if this is a new rundown - improved logic with debugging
  useEffect(() => {
    console.log('Default items effect running:', {
      rundownId: rundownId,
      storageLoading: storage.loading,
      itemsLength: stateIntegration.items.length,
      shouldInitialize: !rundownId && !storage.loading && stateIntegration.items.length === 0
    });
    
    // Only initialize default items if:
    // 1. No rundownId (new rundown)
    // 2. Storage is not loading 
    // 3. Items array is empty
    if (!rundownId && !storage.loading && stateIntegration.items.length === 0) {
      console.log('Initializing new rundown with default items');
      stateIntegration.setItems(defaultRundownItems);
    }
  }, [rundownId, storage.loading, stateIntegration.items.length, stateIntegration.setItems]);

  return {
    // Basic state
    ...basicState,
    
    // Storage operations
    ...storage,
    
    // State management - ensure all functions are exposed
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem
  };
};
