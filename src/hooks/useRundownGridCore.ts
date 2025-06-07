
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownCalculations } from './useRundownCalculations';
import { useRundownHandlers } from './useRundownHandlers';
import { useColumnsManager } from './useColumnsManager';
import { useTimeCalculations } from './useTimeCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { useRealtimeRundownSync } from './useRealtimeRundownSync';
import { useRundownDataLoader } from './useRundownDataLoader';

export const useRundownGridCore = () => {
  // Basic state management
  const {
    rundownId,
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    hasUnsavedChanges,
    isSaving,
    markAsChanged
  } = useRundownBasicState();

  // Items and calculations
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
    setMarkAsChangedCallback,
    itemsUpdateTrigger,
    forceUpdateId
  } = useRundownCalculations();

  // Set the mark as changed callback
  setMarkAsChangedCallback(markAsChanged);

  // Columns management
  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth
  } = useColumnsManager(markAsChanged);

  // Time calculations
  const { currentTime, calculateEndTime, getRowStatus } = useTimeCalculations(
    items,
    rundownStartTime,
    timezone
  );

  // Playback controls - now properly integrated
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items);

  // Data loading
  const { selectedRowId } = useRundownDataLoader(
    rundownId,
    setItems,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout
  );

  // Realtime sync
  const { updateLastUpdateTime, updateTrigger, forceRenderTrigger } = useRealtimeRundownSync({
    rundownId,
    currentUserId: null, // This should come from auth context
    setItems,
    setRundownTitle,
    setTimezone,
    setRundownStartTime,
    handleLoadLayout,
    markAsChanged
  });

  // Handlers
  const {
    handleSave,
    handleLoadRundown,
    handleCreateNew,
    handleTitleChange
  } = useRundownHandlers(
    rundownId,
    rundownTitle,
    timezone,
    rundownStartTime,
    items,
    columns,
    setRundownTitle,
    markAsChanged,
    updateLastUpdateTime
  );

  return {
    // Core state
    rundownId,
    rundownTitle,
    setRundownTitle: handleTitleChange,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    hasUnsavedChanges,
    isSaving,
    markAsChanged,
    
    // Items
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
    
    // Columns
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    
    // Time
    currentTime,
    calculateEndTime,
    getRowStatus,
    
    // Playback controls
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    selectedRowId,
    
    // Handlers
    handleSave,
    handleLoadRundown,
    handleCreateNew,
    
    // Realtime triggers
    updateTrigger,
    forceRenderTrigger
  };
};
