
import { useCallback } from 'react';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { useColumnResizing } from './useColumnResizing';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownGridUI = (
  items: RundownItem[],
  visibleColumns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  currentSegmentId: string | null,
  currentTime: Date,
  handleUpdateColumnWidth: (columnId: string, width: number) => void
) => {
  // Color picker
  const {
    showColorPicker,
    handleToggleColorPicker
  } = useColorPicker();

  // Editing state
  const {
    editingCell,
    setEditingCell
  } = useEditingState();

  // Cell navigation
  const {
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(
    items,
    visibleColumns,
    updateItem,
    editingCell,
    setEditingCell
  );

  // Column resizing
  const {
    getColumnWidth: getColumnWidthNumber,
    updateColumnWidth,
    initializeWidths
  } = useColumnResizing(visibleColumns, handleUpdateColumnWidth);

  // Wrapper function to convert number to string with px
  const getColumnWidth = useCallback((column: Column): string => {
    const width = getColumnWidthNumber(column);
    return `${width}px`;
  }, [getColumnWidthNumber]);

  // Get row status based on current time and playback
  const getRowStatus = useCallback((item: RundownItem) => {
    if (!item.startTime || !item.endTime) return 'upcoming';
    
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    
    if (currentTimeString < item.startTime) return 'upcoming';
    if (currentTimeString >= item.startTime && currentTimeString < item.endTime) return 'completed';
    return 'completed';
  }, [currentTime]);

  // Color selection function
  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
  }, [updateItem]);

  // Column width change handler for header
  const handleColumnWidthChange = useCallback((columnId: string, width: number) => {
    console.log('💾 Column width changed in header, updating');
    updateColumnWidth(columnId, width);
  }, [updateColumnWidth]);

  return {
    // Color picker
    showColorPicker,
    handleToggleColorPicker,
    
    // Row status
    getRowStatus,
    
    // Color selection
    selectColor,
    
    // Cell interactions
    cellRefs,
    handleCellClick,
    handleKeyDown,
    
    // Editing state
    editingCell,
    setEditingCell,

    // Column width handling
    getColumnWidth,
    getColumnWidthNumber,
    updateColumnWidth,
    handleColumnWidthChange,
    initializeWidths
  };
};
