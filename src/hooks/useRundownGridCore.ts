
import { useCallback, useEffect } from 'react';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { usePlaybackControls } from './usePlaybackControls';
import { useRundownUndo } from './useRundownUndo';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';

interface UseRundownGridCoreProps {
  markAsChanged: () => void;
  rundownTitle: string;
  timezone: string;
  rundownStartTime: string;
  setRundownTitleDirectly: (title: string) => void;
  setTimezoneDirectly: (timezone: string) => void;
  setRundownStartTimeDirectly: (startTime: string) => void;
  setAutoSaveTrigger: (trigger: () => void) => void;
  isProcessingRealtimeUpdate?: boolean;
}

export const useRundownGridCore = ({
  markAsChanged,
  rundownTitle,
  timezone,
  rundownStartTime,
  setRundownTitleDirectly,
  setTimezoneDirectly,
  setRundownStartTimeDirectly,
  setAutoSaveTrigger,
  isProcessingRealtimeUpdate
}: UseRundownGridCoreProps) => {
  // State integration with all the core functionality
  const state = useRundownStateIntegration(
    markAsChanged,
    rundownTitle,
    timezone,
    rundownStartTime,
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    setAutoSaveTrigger,
    isProcessingRealtimeUpdate
  );

  // Storage management
  const { savedRundowns, loading: storageLoading, loadRundowns } = useRundownStorage();

  // Data loading
  useRundownDataLoader({
    savedRundowns,
    loading: storageLoading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    handleLoadLayout: state.handleLoadLayout,
    setItems: state.setItems
  });

  // Undo functionality - simplified to only save on auto-save
  const { saveStateOnSave, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId: getCurrentRundownId(),
    currentTitle: rundownTitle,
    currentItems: state.items,
    currentColumns: state.columns
  });

  // Register the undo save function with auto-save
  useEffect(() => {
    if (state.registerUndoSave) {
      state.registerUndoSave(saveStateOnSave);
    }
  }, [state.registerUndoSave, saveStateOnSave]);

  // Enhanced undo handler
  const handleUndo = useCallback(() => {
    console.log('handleUndo called, canUndo:', canUndo);
    if (!canUndo) {
      console.log('Cannot undo - no states available');
      return null;
    }

    return undo(
      state.setItems,
      (layoutData: any) => {
        if (Array.isArray(layoutData)) {
          state.handleLoadLayout(layoutData);
        } else if (layoutData && typeof layoutData === 'object') {
          if ('columns' in layoutData && Array.isArray(layoutData.columns)) {
            state.handleLoadLayout(layoutData.columns);
          } else {
            console.warn('Invalid layout data for undo - no columns array found:', layoutData);
          }
        } else {
          console.warn('Invalid layout data for undo:', layoutData);
        }
      },
      setRundownTitleDirectly
    );
  }, [undo, canUndo, state.setItems, state.handleLoadLayout, setRundownTitleDirectly]);

  // Enhanced setRundownTitle that also triggers change tracking
  const setRundownTitle = useCallback((newTitle: string) => {
    if (rundownTitle !== newTitle) {
      setRundownTitleDirectly(newTitle);
      markAsChanged();
    }
  }, [setRundownTitleDirectly, markAsChanged, rundownTitle]);

  // Showcaller/playback controls
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController
  } = usePlaybackControls(
    state.items,
    state.updateItem
  );

  // Extract rundownId from the URL if available
  function getCurrentRundownId() {
    const pathParts = window.location.pathname.split('/');
    const rundownIndex = pathParts.indexOf('rundown');
    if (rundownIndex !== -1 && pathParts[rundownIndex + 1]) {
      const id = pathParts[rundownIndex + 1];
      return (id === 'new' || id === ':id') ? null : id;
    }
    return null;
  }

  // Realtime collaboration
  const { isConnected } = useStableRealtimeCollaboration({
    rundownId: getCurrentRundownId(),
    onRemoteUpdate: loadRundowns,
    enabled: true
  });

  return {
    ...state,
    savedRundowns,
    loading: storageLoading,
    isProcessingRealtimeUpdate: isProcessingRealtimeUpdate || false,
    isConnected: isConnected || false,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController,
    setRundownTitle,
    currentTime: new Date(),
    handleUndo,
    canUndo,
    lastAction,
    loadUndoHistory,
    saveStateOnSave // Expose this for auto-save integration
  };
};
