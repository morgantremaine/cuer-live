
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
  markAsChanged: () => void
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

  const handleAddRow = useCallback(() => {
    addRow(calculateEndTime);
  }, [addRow, calculateEndTime]);

  const handleAddHeader = useCallback(() => {
    addHeader();
  }, [addHeader]);

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
    handleToggleFloat
  };
};
