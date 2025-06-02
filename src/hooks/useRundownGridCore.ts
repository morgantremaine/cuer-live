
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useMemo } from 'react';

export const useRundownGridCore = () => {
  // Core state management
  const basicState = useRundownBasicState();
  
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
    markAsChanged,
    isInitialized
  } = basicState;

  // Get storage data for the data loader
  const { savedRundowns, loading } = useRundownStorage();

  // Rundown data integration - only run when initialized
  const stateIntegration = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    setRundownTitleDirectly, 
    setTimezoneDirectly
  );

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
  } = stateIntegration;

  // Use data loader to properly set title, timezone, and start time - only when initialized
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    isInitialized,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    handleLoadLayout
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

  // Memoize the entire return object to prevent unnecessary re-renders
  return useMemo(() => ({
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,

    // Items and data
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
    calculateEndTime
  }), [
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,
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
    visibleColumns,
    columns,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving,
    calculateEndTime
  ]);
};
