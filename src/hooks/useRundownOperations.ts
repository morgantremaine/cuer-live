
import { useCallback } from 'react';
import { useRundownClipboardOperations } from './useRundownClipboardOperations';
import { useTimeCalculations } from './useTimeCalculations';
import { usePlaybackControls } from './usePlaybackControls';
import { RundownItem } from '@/types/rundown';

export const useRundownOperations = (
  items: RundownItem[],
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void,
  updateItem: (id: string, field: string, value: string) => void,
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => void,
  addHeader: (insertAfterIndex?: number) => void,
  deleteMultipleRows: (ids: string[]) => void,
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void,
  toggleFloatRow: (id: string) => void,
  rundownStartTime: string,
  selectedRows: Set<string>,
  clearSelection: () => void,
  clipboardItems: RundownItem[],
  copyItems: (items: RundownItem[]) => void,
  hasClipboardData: boolean,
  markAsChanged: () => void,
  handleUndo?: () => void,
  canUndo?: boolean,
  lastAction?: string | null
) => {
  // Time calculations
  const { calculateEndTime, getRowStatus } = useTimeCalculations(
    items,
    updateItem,
    rundownStartTime
  );

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

  // Clipboard operations
  const { handleCopySelectedRows, handlePasteRows } = useRundownClipboardOperations({
    items,
    setItems,
    selectedRows,
    clearSelection,
    addMultipleRows,
    calculateEndTime,
    markAsChanged,
    clipboardItems,
    copyItems,
    hasClipboardData
  });

  // Row operations
  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRow = useCallback((calculateEndTimeFn: (startTime: string, duration: string) => string, selectedRowId?: string, selectedRows?: Set<string>) => {
    // Find the index of the last selected row if multiple rows are selected
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    } else if (selectedRowId) {
      // Single row selection fallback
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    addRow(calculateEndTimeFn, insertAfterIndex);
  }, [addRow, items]);

  const handleAddHeader = useCallback((selectedRowId?: string, selectedRows?: Set<string>) => {
    // Find the index of the last selected row if multiple rows are selected
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      // Find the highest index among selected rows
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    } else if (selectedRowId) {
      // Single row selection fallback
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    addHeader(insertAfterIndex);
  }, [addHeader, items]);

  const handleColorSelect = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
  }, [updateItem]);

  const handleToggleFloat = useCallback((id: string) => {
    toggleFloatRow(id);
  }, [toggleFloatRow]);

  // Row numbering function - simple incremental numbering
  const getRowNumber = useCallback((index: number) => {
    return (index + 1).toString();
  }, []);

  return {
    // Time and calculations
    calculateEndTime,
    getRowStatus,
    getRowNumber,
    
    // Playback
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    
    // Operations
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    handleAddRow,
    handleAddHeader,
    handleColorSelect,
    handleToggleFloat,
    
    // Undo functionality
    handleUndo,
    canUndo,
    lastAction
  };
};
