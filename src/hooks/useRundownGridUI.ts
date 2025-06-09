
import { useState, useCallback, useRef, useMemo } from 'react';
import { useResizableColumns } from './useResizableColumns';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownGridUI = (
  items: RundownItem[],
  visibleColumns: Column[],
  columns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  currentSegmentId: string | null,
  currentTime: Date,
  markAsChanged: () => void
) => {
  const columnWidthTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Enhanced column width callback with separate debouncing for auto-save
  const handleColumnWidthChangeWithSave = useCallback((columnId: string, width: number) => {
    // Clear existing timeout
    if (columnWidthTimeoutRef.current) {
      clearTimeout(columnWidthTimeoutRef.current);
    }
    
    // Debounce the auto-save separately from the visual update
    columnWidthTimeoutRef.current = setTimeout(() => {
      markAsChanged();
    }, 500); // Longer debounce for auto-save
  }, [markAsChanged]);

  // Resizable columns with optimized callback
  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  } = useResizableColumns(columns, handleColumnWidthChangeWithSave);

  // Memoized getColumnWidth to prevent unnecessary re-renders
  const memoizedGetColumnWidth = useMemo(() => getColumnWidth, [getColumnWidth]);

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

  // Get row status based on current time and playback
  const getRowStatus = useCallback((item: RundownItem) => {
    if (!item.startTime || !item.endTime) return 'upcoming';
    
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    
    if (currentTimeString < item.startTime) return 'upcoming';
    if (currentTimeString >= item.startTime && currentTimeString < item.endTime) return 'current';
    return 'completed';
  }, [currentTime]);

  // Color selection function
  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
  }, [updateItem]);

  return {
    // Column management
    columnWidths,
    updateColumnWidth,
    getColumnWidth: memoizedGetColumnWidth,
    getColumnWidthsForSaving,
    
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
    setEditingCell
  };
};
