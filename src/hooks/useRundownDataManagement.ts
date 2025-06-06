
import { useEffect, useRef } from 'react';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownPolling } from './useRundownPolling';
import { useAutoSave } from './useAutoSave';
import { defaultRundownItems } from '@/data/defaultRundownItems';

export const useRundownDataManagement = (rundownId: string) => {
  // Refs to prevent multiple operations
  const isInitializedRef = useRef(false);
  const loadingOperationRef = useRef(false);
  
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

  // Polling for real-time collaboration
  const polling = useRundownPolling({
    rundownId,
    hasUnsavedChanges: basicState.hasUnsavedChanges,
    isAutoSaving: isSaving,
    lastSavedTimestamp,
    onUpdateReceived: (data) => {
      if (loadingOperationRef.current) return;
      
      console.log('Applying remote update:', data.title);
      loadingOperationRef.current = true;
      
      // Update all relevant state
      basicState.setRundownTitleDirectly(data.title);
      stateIntegration.setItems(data.items);
      
      if (data.columns) {
        stateIntegration.handleLoadLayout(data.columns);
      }
      if (data.timezone) {
        basicState.setTimezoneDirectly(data.timezone);
      }
      if (data.startTime) {
        basicState.setRundownStartTimeDirectly(data.startTime);
      }
      
      // Mark as saved with the remote timestamp
      basicState.markAsSaved(data.items, data.title, data.columns, data.timezone, data.startTime);
      
      setTimeout(() => {
        loadingOperationRef.current = false;
      }, 100);
    },
    onConflictDetected: () => {
      console.log('Collaboration conflict detected');
      // The polling hook will handle showing the conflict indicator
    }
  });

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
      isInitializedRef.current = true;
    }
  });

  // Initialize with default items for new rundowns - FIXED with proper guards
  useEffect(() => {
    // Only run for new rundowns (no rundownId)
    if (rundownId) return;
    
    // Wait for storage to finish loading
    if (storage.loading) return;
    
    // Prevent multiple initializations
    if (isInitializedRef.current) return;
    
    // Only initialize if we have no items and storage is done loading
    if (stateIntegration.items.length === 0 && !loadingOperationRef.current) {
      console.log('Initializing new rundown with default items');
      loadingOperationRef.current = true;
      stateIntegration.setItems(defaultRundownItems);
      isInitializedRef.current = true;
      
      setTimeout(() => {
        loadingOperationRef.current = false;
      }, 100);
    }
  }, [rundownId, storage.loading]); // Removed items.length dependency to prevent loop

  return {
    // Basic state
    ...basicState,
    
    // Storage operations
    ...storage,
    
    // State management - ensure all functions are exposed and arrays are validated
    ...stateIntegration,
    
    // Undo/Redo operations
    ...undoSystem,
    
    // Auto-save state
    isSaving,
    lastSavedTimestamp,
    
    // Polling state
    ...polling
  };
};
