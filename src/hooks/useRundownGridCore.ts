
import { useCallback } from 'react';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { usePlaybackControls } from './usePlaybackControls';
import { useRundownUndo } from './useRundownUndo';

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
  const { savedRundowns, loading: storageLoading } = useRundownStorage();

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

  // Undo functionality
  const { saveState, undo, canUndo, lastAction } = useRundownUndo();

  // Enhanced undo handler that works with the current state structure
  const handleUndo = useCallback(() => {
    return undo(
      state.setItems,
      (layoutData) => {
        // handleLoadLayout expects an object with columns property
        if (layoutData && Array.isArray(layoutData)) {
          state.handleLoadLayout({ columns: layoutData });
        } else {
          state.handleLoadLayout(layoutData);
        }
      },
      setRundownTitleDirectly
    );
  }, [undo, state.setItems, state.handleLoadLayout, setRundownTitleDirectly]);

  // Enhanced setRundownTitle that also triggers change tracking
  const setRundownTitle = useCallback((newTitle: string) => {
    setRundownTitleDirectly(newTitle);
    markAsChanged();
  }, [setRundownTitleDirectly, markAsChanged]);

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

  return {
    ...state,
    savedRundowns,
    loading: storageLoading,
    isProcessingRealtimeUpdate: isProcessingRealtimeUpdate || false,
    isConnected: false, // Default to false since we're not using realtime in this simplified version
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
    lastAction
  };
};
