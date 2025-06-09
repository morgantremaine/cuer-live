
import { useCallback } from 'react';
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

  // Undo functionality
  const { saveState, undo, canUndo, lastAction } = useRundownUndo();

  // Enhanced undo handler that works with the current state structure
  const handleUndo = useCallback(() => {
    return undo(
      state.setItems,
      (layoutData: any) => {
        // Check if layoutData is an array (Column[])
        if (Array.isArray(layoutData)) {
          state.handleLoadLayout(layoutData);
        } else if (layoutData && typeof layoutData === 'object') {
          // Check if it has a columns property
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
  }, [undo, state.setItems, state.handleLoadLayout, setRundownTitleDirectly]);

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

  // Realtime collaboration - Extract rundownId from the URL if available
  const getCurrentRundownId = () => {
    const pathParts = window.location.pathname.split('/');
    const rundownIndex = pathParts.indexOf('rundown');
    if (rundownIndex !== -1 && pathParts[rundownIndex + 1]) {
      const id = pathParts[rundownIndex + 1];
      return (id === 'new' || id === ':id') ? null : id;
    }
    return null;
  };

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
    lastAction
  };
};
