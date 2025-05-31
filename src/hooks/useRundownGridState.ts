
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownUIState } from './useRundownUIState';
import { useRundownInteractionHandlers } from './useRundownInteractionHandlers';

export const useRundownGridState = () => {
  // Core state management
  const {
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
    markAsChanged
  } = useRundownBasicState();

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
    handleToggleColumnVisibility,
    handleLoadLayout,
    hasUnsavedChanges,
    isSaving
  } = useRundownStateIntegration(markAsChanged, rundownTitle);

  // Playback controls
  const { 
    isPlaying, 
    currentSegmentId, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(items, rundownStartTime);

  // Time calculations
  const { calculateEndTime } = useTimeCalculations();

  // UI state management - fix selectColor function signature
  const {
    showColorPicker,
    handleToggleColorPicker,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor
  } = useRundownUIState(
    items,
    visibleColumns,
    columns,
    updateItem,
    currentSegmentId,
    currentTime,
    markAsChanged
  );

  // Interaction handlers - fix selectColor parameter
  const {
    selectedRows,
    toggleRowSelection,
    clearSelection,
    draggedItemIndex,
    isDraggingMultiple,
    handleDragStart,
    handleDragOver,
    handleDrop,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  } = useRundownInteractionHandlers(
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    calculateEndTime,
    selectColor,
    markAsChanged,
    setRundownTitle
  );

  return {
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
    visibleColumns,
    columns,

    // UI state
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    currentSegmentId,

    // Functions
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    updateItem: handleUpdateItem,
    handleCellClick,
    handleKeyDown,
    handleToggleColorPicker,
    selectColor,
    deleteRow: handleDeleteRow,
    toggleFloatRow: handleToggleFloat,
    toggleRowSelection: handleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDrop,
    addRow: handleAddRow,
    addHeader: handleAddHeader,

    // Multi-selection actions
    hasClipboardData,
    copyItems: handleCopySelectedRows,
    addMultipleRows,
    deleteMultipleRows: handleDeleteSelectedRows,
    clearSelection,
    clipboardItems,
    handlePasteRows,

    // Playback
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,

    // Column management
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn: handleDeleteColumnWithCleanup,
    handleToggleColumnVisibility,
    handleLoadLayout,

    // Save state
    hasUnsavedChanges,
    isSaving,
    calculateTotalRuntime,
    calculateEndTime
  };
};
