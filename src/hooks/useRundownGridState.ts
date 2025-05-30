import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
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

export const useRundownGridState = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [timezone, setTimezone] = useState('America/New_York');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');

  const { id: rundownId } = useParams<{ id: string }>();

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

  const { hasUnsavedChanges, markAsChanged } = useAutoSave(items, rundownTitle);

  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  } = useColumnsManager(markAsChanged);

  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  } = useResizableColumns(visibleColumns);

  const {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(visibleColumns, items);

  const {
    draggedItemIndex,
    handleDragStart,
    handleDragOver,
    handleDrop
  } = useDragAndDrop(items, setItems);

  const {
    calculateEndTime,
    getRowStatus
  } = useTimeCalculations(items, updateItem);

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

  // Timer effect for current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
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
    markAsChanged,
    
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
