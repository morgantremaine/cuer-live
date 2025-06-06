
import { useEffect } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownRealtime } from './useRundownRealtime';
import { useEditingDetection } from './useEditingDetection';
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

  // Detect when user is actively editing
  const { isEditing } = useEditingDetection();

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

  // Get current rundown data for realtime comparison
  const currentRundown = storage.savedRundowns.find(r => r.id === rundownId);

  // Initialize realtime updates - ensure this is called for every rundown
  useRundownRealtime({
    currentRundownId: rundownId,
    currentUpdatedAt: currentRundown?.updated_at,
    onRemoteUpdate: () => {
      console.log('Remote rundown update detected, refreshing data...');
      // Always refresh when remote update is detected, but be smarter about conflicts
      if (!stateIntegration.isSaving) {
        console.log('Applying remote update - reloading rundowns');
        storage.loadRundowns();
      } else {
        console.log('Delaying remote update - currently saving');
        // Set a timeout to check again after saving is done
        setTimeout(() => {
          if (!stateIntegration.isSaving) {
            console.log('Applying delayed remote update');
            storage.loadRundowns();
          }
        }, 1000);
      }
    },
    isUserEditing: isEditing,
    isSaving: stateIntegration.isSaving
  });

  // Initialize with default items for new rundowns - fixed logic with better guards
  useEffect(() => {
    // Only run for new rundowns (no rundownId)
    if (rundownId) return;
    
    // Wait for storage to finish loading
    if (storage.loading) return;
    
    // Check if items are already initialized (prevent multiple initializations)
    const currentItems = stateIntegration.items;
    if (!Array.isArray(currentItems)) {
      console.warn('Items is not an array, resetting to default items');
      stateIntegration.setItems(defaultRundownItems);
      return;
    }
    
    if (currentItems.length > 0) return;
    
    console.log('Initializing new rundown with default items');
    stateIntegration.setItems(defaultRundownItems);
  }, [rundownId, storage.loading, stateIntegration.items.length]);

  return {
    // Basic state
    ...basicState,
    
    // Storage operations
    ...storage,
    
    // State management - ensure all functions are exposed and arrays are validated
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem
  };
};
