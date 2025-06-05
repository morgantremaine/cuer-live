
import { useRundownBasicState } from './useRundownBasicState';
import { useSimpleRundownState } from './useSimpleRundownState';
import { useSimpleDataLoader } from './useSimpleDataLoader';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useCallback } from 'react';

export const useRundownCoreState = () => {
  // Basic state management
  const {
    currentTime,
    timezone,
    setTimezone,
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime,
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged
  } = useRundownBasicState();

  // Get storage functionality
  const { savedRundowns, loading, updateRundown } = useRundownStorage();

  // Simplified rundown state
  const simplifiedState = useSimpleRundownState(rundownTitle, timezone, rundownStartTime);

  // Undo functionality
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId,
    updateRundown,
    currentTitle: rundownTitle,
    currentItems: simplifiedState.items,
    currentColumns: simplifiedState.columns
  });

  // Simple data loader
  useSimpleDataLoader({
    savedRundowns,
    loading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    handleLoadLayout: simplifiedState.handleLoadLayout,
    setItems: simplifiedState.setItems,
    setIsLoading: simplifiedState.setIsLoading,
    onRundownLoaded: (rundown) => {
      if (rundown.undo_history) {
        loadUndoHistory(rundown.undo_history);
      }
    }
  });

  // Playback controls
  const { 
    isPlaying, 
    currentSegmentId, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(simplifiedState.items, simplifiedState.updateItem);

  // Time calculations
  const { calculateEndTime } = useTimeCalculations(simplifiedState.items, simplifiedState.updateItem, rundownStartTime);

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime,
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged,

    // Simplified state
    ...simplifiedState,

    // Playback
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,

    // Time calculations
    calculateEndTime,

    // Undo functionality
    saveState,
    undo,
    canUndo,
    lastAction
  };
};
