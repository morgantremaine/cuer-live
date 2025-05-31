
import { useCallback } from 'react';
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useClipboard } from './useClipboard';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { usePlaybackControls } from './usePlaybackControls';
import { useColorPicker } from './useColorPicker';
import { useCellNavigation } from './useCellNavigation';
import { useResizableColumns } from './useResizableColumns';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownGridHandlers } from './useRundownGridHandlers';

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

  // Clipboard functionality
  const { clipboardItems, copyItems, hasClipboardData } = useClipboard();

  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();

  // Drag and drop
  const { 
    draggedItemIndex, 
    isDraggingMultiple, 
    handleDragStart, 
    handleDragOver, 
    handleDrop 
  } = useDragAndDrop(items, setItems, selectedRows, markAsChanged);

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

  // Color picker
  const { showColorPicker, handleToggleColorPicker } = useColorPicker();

  // Cell navigation
  const { cellRefs, handleCellClick, handleKeyDown } = useCellNavigation(
    items, 
    visibleColumns, 
    updateItem, 
    handleToggleColorPicker
  );

  // Resizable columns
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(columns);

  // Time calculations
  const { calculateEndTime } = useTimeCalculations();

  // Status calculations
  const getRowStatus = useCallback((item: any) => {
    if (item.id === currentSegmentId) return 'current';
    
    const now = currentTime;
    const itemStartTime = new Date(`1970-01-01T${item.startTime}`);
    const currentTimeForComparison = new Date(`1970-01-01T${now.toTimeString().split(' ')[0]}`);
    
    return currentTimeForComparison > itemStartTime ? 'completed' : 'upcoming';
  }, [currentSegmentId, currentTime]);

  // Color selection function
  const selectColor = useCallback((id: string, color: string, updateItemFn: (id: string, field: string, value: string) => void) => {
    updateItemFn(id, 'color', color);
    markAsChanged();
  }, [markAsChanged]);

  // Grid handlers
  const {
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
  } = useRundownGridHandlers({
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    setItems,
    calculateEndTime,
    selectColor,
    markAsChanged,
    selectedRows,
    clearSelection,
    copyItems,
    clipboardItems,
    hasClipboardData,
    toggleRowSelection,
    items,
    setRundownTitle
  });

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
