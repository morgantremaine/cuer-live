
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
  
  // Drag and drop - fix: remove the extra markAsChanged parameter
  const { 
    draggedItemIndex, 
    isDraggingMultiple, 
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop
  } = useDragAndDrop(coreState.items, coreState.setItems, selectedRows);

  // Resizable columns
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(
    coreState.columns, 
    coreState.handleUpdateColumnWidth
  );

  // Time calculations
  const { calculateEndTime, getRowStatus } = useTimeCalculations(
    coreState.items,
    coreState.updateItem,
    rundownStartTime
  );
  
  // Add current time separately
  const currentTime = new Date();

  // Cell navigation
  const { handleCellClick, handleKeyDown } = useCellNavigation(
    coreState.visibleColumns,
    coreState.items
  );

  // Undo functionality - fix the destructuring
  const undoHook = useRundownUndo();
  const handleUndo = () => {
    return undoHook.undo(coreState.setItems, (columns: any) => {}, setRundownTitle);
  };
  const canUndo = undoHook.canUndo;
  const lastAction = undoHook.lastAction;

  // Playback controls - fix: provide the required 3 parameters
  const { 
    isPlaying, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(coreState.items, currentTime, rundownStartTime);

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

  // Row operations - create wrapper functions that properly handle the parameter conversion
  const wrappedAddRow = (calculateEndTimeFn: any, selectedRowId?: string) => {
    // Convert selectedRowId to insertAfterIndex
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRowId) {
      const selectedIndex = coreState.items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    coreState.addRow(calculateEndTimeFn, insertAfterIndex);
  };

  const wrappedAddHeader = (selectedRowId?: string) => {
    // Convert selectedRowId to insertAfterIndex
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRowId) {
      const selectedIndex = coreState.items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    coreState.addHeader(insertAfterIndex);
  };

  // Create simplified versions for components that don't pass parameters
  const handleAddRow = () => {
    coreState.addRow(calculateEndTime);
  };

  const handleAddHeader = () => {
    coreState.addHeader();
  };

  const { handleDeleteSelectedRows } = useRundownRowOperations({
    selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    calculateEndTime
  });

  // Helper functions
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
    getRowStatus,
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
    
    // Row operations - provide both versions
    handleAddRow, // Simple version for components that don't pass parameters
    handleAddHeader, // Simple version for components that don't pass parameters
    addRow: wrappedAddRow, // Parameterized version for useIndexHandlers
    addHeader: wrappedAddHeader, // Parameterized version for useIndexHandlers
    
    // Item operations
    handleUpdateItem,
    handleRowSelection,
    updateItem: handleUpdateItem, // Alias for compatibility
    
    // Helper functions
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
    getRowStatus,
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
    wrappedAddRow,
    wrappedAddHeader,
    handleUpdateItem,
    handleRowSelection,
    selectColor
  ]);
};
