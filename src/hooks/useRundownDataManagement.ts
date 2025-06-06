
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
  // Single initialization flag to prevent multiple instances
  const isInitializedRef = useRef(false);
  const loadingRef = useRef(false);
  
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

  // Use the data loader only once
  useRundownDataLoader({
    rundownId,
    savedRundowns: storage.savedRundowns,
    loading: storage.loading || loadingRef.current,
    setRundownTitle: basicState.setRundownTitleDirectly,
    setTimezone: basicState.setTimezoneDirectly,
    setRundownStartTime: basicState.setRundownStartTimeDirectly,
    handleLoadLayout: stateIntegration.handleLoadLayout,
    setItems: stateIntegration.setItems,
    onRundownLoaded: (rundown) => {
      console.log('Rundown loaded successfully:', rundown.title);
      loadingRef.current = false;
      basicState.setIsLoading(false);
    }
  });

  // Initialize new rundowns only once
  useEffect(() => {
    if (isInitializedRef.current || rundownId || storage.loading || loadingRef.current) {
      return;
    }
    
    if (stateIntegration.items.length === 0 && storage.savedRundowns.length >= 0) {
      console.log('Initializing new rundown with default items');
      loadingRef.current = true;
      basicState.setIsLoading(true);
      
      stateIntegration.setItems(defaultRundownItems);
      
      setTimeout(() => {
        loadingRef.current = false;
        basicState.setIsLoading(false);
        isInitializedRef.current = true;
      }, 100);
    }
  }, [rundownId, storage.loading, stateIntegration.items.length, storage.savedRundowns.length]);

  // Auto-save functionality
  const { isSaving, lastSavedTimestamp } = useAutoSave(
    rundownId,
    basicState.hasUnsavedChanges && basicState.isInitialized,
    stateIntegration.items,
    basicState.rundownTitle,
    stateIntegration.columns,
    basicState.timezone,
    basicState.rundownStartTime,
    basicState.markAsSaved,
    undoSystem.undoHistory
  );

  // Polling for existing rundowns only
  const polling = useRundownPolling({
    rundownId: rundownId || undefined,
    hasUnsavedChanges: basicState.hasUnsavedChanges,
    isAutoSaving: isSaving,
    lastSavedTimestamp,
    onUpdateReceived: (data) => {
      if (loadingRef.current) return;
      
      console.log('Applying remote update:', data.title);
      loadingRef.current = true;
      basicState.setIsLoading(true);
      
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
      
      basicState.markAsSaved(data.items, data.title, data.columns, data.timezone, data.startTime);
      
      setTimeout(() => {
        loadingRef.current = false;
        basicState.setIsLoading(false);
      }, 100);
    },
    onConflictDetected: () => {
      console.log('Collaboration conflict detected');
    }
  });

  return {
    ...basicState,
    ...storage,
    ...stateIntegration,
    ...undoSystem,
    isSaving,
    lastSavedTimestamp,
    ...polling,
    isInitialized: basicState.isInitialized
  };
};
