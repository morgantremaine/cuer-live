
import { useRundownBasicState } from '@/hooks/useRundownBasicState';
import { useRundownDataManagement } from '@/hooks/useRundownDataManagement';
import { useRundownInteractions } from '@/hooks/useRundownInteractions';
import { useRundownDataLoader } from '@/hooks/useRundownDataLoader';

export const useRundownGridState = () => {
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
  } = useRundownBasicState();

  // Create markAsChanged function to pass to data management
  const markAsChanged = () => {
    // This will be provided by the auto-save system
  };

  const {
    rundownId,
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
    hasUnsavedChanges,
    isSaving,
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    savedRundowns,
    loading,
  } = useRundownDataManagement(rundownTitle, markAsChanged);

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    calculateEndTime,
    getRowStatus,
    showColorPicker,
    handleToggleColorPicker,
    selectColor,
    selectedRows,
    toggleRowSelection,
    clearSelection,
    clipboardItems,
    copyItems,
    hasClipboardData,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
  } = useRundownInteractions(visibleColumns, items, setItems, updateItem, rundownStartTime);

  // Load data when rundown changes
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle,
    handleLoadLayout
  });

  // Get the actual markAsChanged from auto-save
  const { markAsChanged: actualMarkAsChanged } = useRundownDataManagement(rundownTitle, () => {});

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
    
    // Items state
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
    
    // Auto-save state
    hasUnsavedChanges,
    isSaving,
    markAsChanged: actualMarkAsChanged,
    
    // Columns state
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    
    // Resizable columns state
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    
    // Cell navigation state
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    
    // Drag and drop state
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    
    // Time calculations
    calculateEndTime,
    getRowStatus,
    
    // Color picker state
    showColorPicker,
    handleToggleColorPicker,
    selectColor,
    
    // Row selection state
    selectedRows,
    toggleRowSelection,
    clearSelection,
    
    // Clipboard state
    clipboardItems,
    copyItems,
    hasClipboardData,
    
    // Playback state
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  };
};
