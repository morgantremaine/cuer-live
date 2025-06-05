
import { useMemo, useState, useRef } from 'react';
import { useRundownDataManagement } from './useRundownDataManagement';
import { useRundownClipboard } from './useRundownClipboard';
import { useRundownClipboardOperations } from './useRundownClipboardOperations';
import { useRundownRowOperations } from './useRundownRowOperations';
import { useMultiRowSelection } from './useMultiRowSelection';
import { useDragAndDrop } from './useDragAndDrop';
import { useResizableColumns } from './useResizableColumns';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useCellNavigation } from './useCellNavigation';
import { useRundownUndo } from './useRundownUndo';

export const useRundownGridState = () => {
  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York'); 
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [showColumnManager, setShowColumnManager] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  
  // Refs for UI interaction
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Core data management - single source of truth
  const coreState = useRundownDataManagement(
    rundownTitle, 
    timezone, 
    rundownStartTime,
    setRundownTitle,
    setTimezone, 
    setRundownStartTime
  );
  
  // Multi-row selection
  const { selectedRows, toggleRowSelection, clearSelection } = useMultiRowSelection();
  
  // Drag and drop
  const { 
    draggedItemIndex, 
    isDraggingMultiple, 
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(coreState.items, coreState.setItems, selectedRows, coreState.markAsChanged);

  // Resizable columns
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(
    coreState.columns, 
    coreState.handleUpdateColumnWidth
  );

  // Time calculations
  const { calculateEndTime, currentTime } = useTimeCalculations(rundownStartTime);

  // Cell navigation
  const { handleCellClick, handleKeyDown } = useCellNavigation(
    coreState.visibleColumns,
    coreState.items
  );

  // Undo functionality
  const { handleUndo, canUndo, lastAction } = useRundownUndo();

  // Playback controls
  const { 
    isPlaying, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(coreState.items, currentTime);

  // Clipboard management
  const { clipboardItems, copyItems, hasClipboardData } = useRundownClipboard();
  
  // Clipboard operations
  const { handleCopySelectedRows, handlePasteRows } = useRundownClipboardOperations({
    items: coreState.items,
    setItems: coreState.setItems,
    selectedRows,
    clearSelection,
    addMultipleRows: coreState.addMultipleRows,
    calculateEndTime,
    markAsChanged: coreState.markAsChanged,
    clipboardItems,
    copyItems,
    hasClipboardData
  });

  // Row operations - fix parameter signatures
  const { handleDeleteSelectedRows, handleAddRow, handleAddHeader } = useRundownRowOperations({
    selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection,
    addRow: (calculateEndTimeFn: any, insertAfterIndex?: number) => {
      coreState.addRow(calculateEndTimeFn, insertAfterIndex);
    },
    addHeader: (insertAfterIndex?: number) => {
      coreState.addHeader(insertAfterIndex);
    },
    calculateEndTime
  });

  // Helper functions
  const getRowStatus = (item: any, currentTime: Date): 'upcoming' | 'current' | 'completed' => {
    // Simple status calculation - can be enhanced later
    return 'upcoming';
  };

  const handleToggleColorPicker = (itemId: string) => {
    setShowColorPicker(showColorPicker === itemId ? null : itemId);
  };

  const selectColor = (id: string, color: string) => {
    coreState.updateItem(id, 'color', color);
    setShowColorPicker(null);
  };

  // Additional handlers for compatibility
  const handleUpdateItem = (id: string, field: string, value: string) => {
    coreState.updateItem(id, field, value);
  };

  const handleRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, coreState.items);
  };

  // Memoize the complete state object
  return useMemo(() => ({
    // Basic state
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    showColumnManager,
    setShowColumnManager,
    showColorPicker,
    currentSegmentId,
    cellRefs,
    currentTime,
    
    // Core data from useRundownDataManagement
    ...coreState,
    
    // UI interactions
    selectedRows,
    toggleRowSelection,
    clearSelection,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    
    // Column management
    getColumnWidth,
    updateColumnWidth,
    
    // Cell navigation
    handleCellClick,
    handleKeyDown,
    
    // Undo functionality
    handleUndo,
    canUndo,
    lastAction,
    
    // Time and playback
    calculateEndTime,
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    
    // Clipboard
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    
    // Row operations
    handleAddRow,
    handleAddHeader,
    
    // Item operations
    handleUpdateItem,
    handleRowSelection,
    
    // Helper functions
    getRowStatus,
    handleToggleColorPicker,
    selectColor
  }), [
    rundownTitle,
    timezone,
    rundownStartTime,
    showColumnManager,
    showColorPicker,
    currentSegmentId,
    currentTime,
    coreState,
    selectedRows,
    toggleRowSelection,
    clearSelection,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown,
    handleUndo,
    canUndo,
    lastAction,
    calculateEndTime,
    isPlaying,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader,
    handleUpdateItem,
    handleRowSelection,
    selectColor
  ]);
};
