
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRundownGridWrappedFunctions } from './useRundownGridWrappedFunctions';
import { useRundownGridKeyboardHandlers } from './useRundownGridKeyboardHandlers';
import { useCallback } from 'react';

export const useRundownGridCore = () => {
  // Core state management
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

  // Rundown data integration
  const {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving
  } = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    setRundownTitleDirectly, 
    setTimezoneDirectly
  );

  // Undo functionality with persistence
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo();

  // Use data loader with undo history loading
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    handleLoadLayout,
    setItems,
    onRundownLoaded: (rundown) => {
      // Load undo history when rundown is loaded
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
  } = usePlaybackControls(items, updateItem);

  // Time calculations
  const { calculateEndTime } = useTimeCalculations(items, updateItem, rundownStartTime);

  // Get wrapped functions with undo support
  const {
    wrappedAddRow,
    wrappedAddHeader,
    wrappedDeleteRow,
    wrappedDeleteMultipleRows,
    wrappedToggleFloatRow,
    wrappedSetItems,
    wrappedAddMultipleRows,
    wrappedSetRundownTitle
  } = useRundownGridWrappedFunctions({
    items,
    columns,
    rundownTitle,
    saveState,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    toggleFloatRow,
    setItems,
    setRundownTitle
  });

  const handleUndo = useCallback(() => {
    const action = undo(setItems, handleLoadLayout, setRundownTitleDirectly);
    if (action) {
      markAsChanged();
      console.log(`Undid: ${action}`);
    }
  }, [undo, setItems, handleLoadLayout, setRundownTitleDirectly, markAsChanged]);

  // Setup keyboard handlers
  useRundownGridKeyboardHandlers({
    canUndo,
    handleUndo
  });

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: wrappedSetRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,

    // Items and data - use wrapped versions for undo support
    items,
    setItems: wrappedSetItems,
    updateItem,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    deleteRow: wrappedDeleteRow,
    deleteMultipleRows: wrappedDeleteMultipleRows,
    addMultipleRows: wrappedAddMultipleRows,
    getRowNumber,
    toggleFloatRow: wrappedToggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    visibleColumns,
    columns,

    // Playback
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,

    // Column management
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,

    // Save state
    hasUnsavedChanges,
    isSaving,
    calculateEndTime,

    // Undo functionality
    handleUndo,
    canUndo,
    lastAction
  };
};
