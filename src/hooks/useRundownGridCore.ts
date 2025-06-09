
import { useCallback } from 'react';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRealtimeRundown } from './useRealtimeRundown';
import { usePlaybackControls } from './usePlaybackControls';

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

  // Realtime collaboration
  const { isProcessingRealtimeUpdate: realtimeProcessing } = useRealtimeRundown({
    items: state.items,
    columns: state.columns,
    rundownTitle,
    timezone,
    rundownStartTime,
    setItems: state.setItems,
    handleLoadLayout: state.handleLoadLayout,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    updateSavedSignature: state.updateSavedSignature,
    setApplyingRemoteUpdate: state.setApplyingRemoteUpdate
  });

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

  // Enhanced setRundownTitle that also triggers change tracking
  const setRundownTitle = useCallback((newTitle: string) => {
    setRundownTitleDirectly(newTitle);
    markAsChanged();
  }, [setRundownTitleDirectly, markAsChanged]);

  return {
    ...state,
    savedRundowns,
    loading: storageLoading,
    isProcessingRealtimeUpdate: realtimeProcessing || isProcessingRealtimeUpdate,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController,
    setRundownTitle,
    currentTime: new Date()
  };
};
