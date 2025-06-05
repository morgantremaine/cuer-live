
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

  // Initialize with default items for new rundowns ONLY - better logic
  useEffect(() => {
    // Only run for new rundowns (no rundownId) and only once
    if (rundownId) return;
    
    // Wait for storage to finish loading
    if (storage.loading) return;
    
    // Only initialize if we haven't already set items and title is still default
    const isDefaultState = basicState.rundownTitle === 'Live Broadcast Rundown' && 
                           stateIntegration.items.length === 0;
    
    if (isDefaultState) {
      console.log('Initializing new rundown with default items (one-time only)');
      stateIntegration.setItems(defaultRundownItems);
    }
  }, [rundownId, storage.loading, basicState.rundownTitle, stateIntegration.items.length]);

  return {
    // Basic state
    ...basicState,
    
    // Storage operations
    ...storage,
    
    // State management
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem
  };
};
