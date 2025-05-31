
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridUI } from './useRundownGridUI';
import { useRundownGridInteractions } from './useRundownGridInteractions';

export const useRundownGridState = () => {
  // Get core state and data
  const coreState = useRundownGridCore();

  // UI state management
  const uiState = useRundownGridUI(
    coreState.items,
    coreState.visibleColumns,
    coreState.columns,
    coreState.updateItem,
    coreState.currentSegmentId,
    coreState.currentTime,
    coreState.markAsChanged
  );

  // Interaction handlers
  const interactions = useRundownGridInteractions(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloatRow,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.handleDeleteColumn,
    coreState.calculateEndTime,
    uiState.selectColor,
    coreState.markAsChanged,
    coreState.setRundownTitle
  );

  return {
    // Basic state
    currentTime: coreState.currentTime,
    timezone: coreState.timezone,
    setTimezone: coreState.setTimezone,
    showColumnManager: coreState.showColumnManager,
    setShowColumnManager: coreState.setShowColumnManager,
    rundownTitle: coreState.rundownTitle,
    setRundownTitle: coreState.setRundownTitle,
    rundownStartTime: coreState.rundownStartTime,
    setRundownStartTime: coreState.setRundownStartTime,
    rundownId: coreState.rundownId,
    markAsChanged: coreState.markAsChanged,

    // Items and data
    items: coreState.items,
    setItems: coreState.setItems,
    visibleColumns: coreState.visibleColumns,
    columns: coreState.columns,

    // UI state
    showColorPicker: uiState.showColorPicker,
    cellRefs: uiState.cellRefs,
    selectedRows: interactions.selectedRows,
    draggedItemIndex: interactions.draggedItemIndex,
    isDraggingMultiple: interactions.isDraggingMultiple,
    currentSegmentId: coreState.currentSegmentId,

    // Functions
    getColumnWidth: uiState.getColumnWidth,
    updateColumnWidth: uiState.updateColumnWidth,
    getRowNumber: coreState.getRowNumber,
    getRowStatus: uiState.getRowStatus,
    calculateHeaderDuration: coreState.calculateHeaderDuration,
    updateItem: interactions.handleUpdateItem,
    handleCellClick: uiState.handleCellClick,
    handleKeyDown: uiState.handleKeyDown,
    handleToggleColorPicker: uiState.handleToggleColorPicker,
    selectColor: uiState.selectColor,
    deleteRow: interactions.handleDeleteRow,
    toggleFloatRow: interactions.handleToggleFloat,
    toggleRowSelection: interactions.handleRowSelection,
    handleDragStart: interactions.handleDragStart,
    handleDragOver: interactions.handleDragOver,
    handleDrop: interactions.handleDrop,
    addRow: interactions.handleAddRow,
    addHeader: interactions.handleAddHeader,

    // Multi-selection actions
    hasClipboardData: interactions.hasClipboardData,
    copyItems: interactions.handleCopySelectedRows,
    addMultipleRows: coreState.addMultipleRows,
    deleteMultipleRows: interactions.handleDeleteSelectedRows,
    clearSelection: interactions.clearSelection,
    clipboardItems: interactions.clipboardItems,
    handlePasteRows: interactions.handlePasteRows,

    // Playback
    isPlaying: coreState.isPlaying,
    timeRemaining: coreState.timeRemaining,
    play: coreState.play,
    pause: coreState.pause,
    forward: coreState.forward,
    backward: coreState.backward,

    // Column management
    handleAddColumn: coreState.handleAddColumn,
    handleReorderColumns: coreState.handleReorderColumns,
    handleDeleteColumn: interactions.handleDeleteColumnWithCleanup,
    handleToggleColumnVisibility: coreState.handleToggleColumnVisibility,
    handleLoadLayout: coreState.handleLoadLayout,

    // Save state
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving,
    calculateTotalRuntime: coreState.calculateTotalRuntime,
    calculateEndTime: coreState.calculateEndTime
  };
};
