
import { useRundownItems } from '@/hooks/useRundownItems';
import { useColumnsManager } from '@/hooks/useColumnsManager';
import { useResizableColumns } from '@/hooks/useResizableColumns';
import { useCellNavigation } from '@/hooks/useCellNavigation';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTimeCalculations } from '@/hooks/useTimeCalculations';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMultiRowSelection } from '@/hooks/useMultiRowSelection';
import { useClipboard } from '@/hooks/useClipboard';
import { usePlaybackControls } from '@/hooks/usePlaybackControls';
import { useAutoSave } from '@/hooks/useAutoSave';
import { RundownItem } from '@/hooks/useRundownItems';

interface UseRundownStateIntegrationProps {
  rundownTitle: string;
  rundownStartTime: string;
}

export const useRundownStateIntegration = ({ rundownTitle, rundownStartTime }: UseRundownStateIntegrationProps) => {
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
    calculateHeaderDuration
  } = useRundownItems();

  // Create markAsChanged function that will be passed to columns manager
  const markAsChangedCallback = () => {
    // This will be replaced by the actual markAsChanged from useAutoSave
  };

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleUpdateColumnName
  } = useColumnsManager(markAsChangedCallback);

  // Now pass columns to useAutoSave
  const { hasUnsavedChanges, isSaving, markAsChanged } = useAutoSave(items, rundownTitle, columns);

  // Update the columns manager to use the real markAsChanged
  const columnsManager = useColumnsManager(markAsChanged);

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(columnsManager.visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(columnsManager.visibleColumns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem, rundownStartTime);

  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect: selectColor
  } = useColorPicker();

  const {
    selectedRows,
    toggleRowSelection,
    clearSelection
  } = useMultiRowSelection();

  const {
    clipboardItems,
    copyItems,
    hasClipboardData
  } = useClipboard();

  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  } = usePlaybackControls(items, updateItem);

  return {
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
    markAsChanged,
    
    // Columns state (use the properly initialized columns manager)
    columns: columnsManager.columns,
    visibleColumns: columnsManager.visibleColumns,
    handleAddColumn: columnsManager.handleAddColumn,
    handleUpdateColumnName: columnsManager.handleUpdateColumnName,
    
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
