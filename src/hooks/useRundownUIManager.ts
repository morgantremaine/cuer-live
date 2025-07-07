import { useState, useRef, useCallback } from 'react';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { CalculatedRundownItem } from '@/utils/rundownCalculations';
import { Column } from './useColumnsManager';

export const useRundownUIManager = (
  items: CalculatedRundownItem[],
  visibleColumns: Column[],
  columns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  markAsChanged: () => void,
  handleUpdateColumnWidth?: (columnId: string, width: number) => void
) => {
  // Debounced markAsChanged to prevent rapid auto-save during resize
  const markAsChangedTimeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedMarkAsChanged = useCallback(() => {
    if (markAsChangedTimeoutRef.current) {
      clearTimeout(markAsChangedTimeoutRef.current);
    }
    
    markAsChangedTimeoutRef.current = setTimeout(() => {
      markAsChanged();
    }, 300);
  }, [markAsChanged]);

  // Column width management - restored to original simple pattern
  const getColumnWidth = useCallback((column: Column) => {
    return column.width || '150px';
  }, []);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    // Find the column to get its minimum width
    const column = columns.find(col => col.id === columnId);
    const getMinimumWidth = (col: Column): number => {
      switch (col.key) {
        case 'duration':
        case 'startTime':
        case 'endTime':
        case 'elapsedTime':
          return 95;
        case 'segmentName':
          return 100;
        case 'talent':
          return 60;
        case 'script':
        case 'notes':
          return 120;
        case 'gfx':
        case 'video':
          return 80;
        default:
          return 50;
      }
    };
    
    const minimumWidth = column ? getMinimumWidth(column) : 50;
    const constrainedWidth = Math.max(minimumWidth, width);
    
    debouncedMarkAsChanged();
    
    if (handleUpdateColumnWidth) {
      handleUpdateColumnWidth(column?.id || '', constrainedWidth);
    }
  }, [columns, debouncedMarkAsChanged, handleUpdateColumnWidth]);

  // Color picker state
  const {
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect,
    closeColorPicker
  } = useColorPicker();

  // Editing state
  const {
    editingCell,
    setEditingCell
  } = useEditingState();

  // Convert CalculatedRundownItem to RundownItem for cell navigation compatibility
  const regularItems = items.map(item => ({
    ...item,
    startTime: item.calculatedStartTime,
    endTime: item.calculatedEndTime,
    elapsedTime: item.calculatedElapsedTime,
    rowNumber: item.calculatedRowNumber
  }));

  // Cell navigation
  const {
    cellRefs,
    handleCellClick,
    handleKeyDown
  } = useCellNavigation(
    regularItems,
    visibleColumns,
    updateItem,
    editingCell,
    setEditingCell
  );

  // Color selection function
  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
    // Close the color picker after selection
    closeColorPicker();
  }, [updateItem, closeColorPicker]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (markAsChangedTimeoutRef.current) {
      clearTimeout(markAsChangedTimeoutRef.current);
    }
  }, []);

  return {
    // Column management
    updateColumnWidth,
    getColumnWidth,
    
    // Color picker
    showColorPicker,
    handleToggleColorPicker,
    handleColorSelect,
    closeColorPicker,
    selectColor,
    
    // Cell interactions
    cellRefs,
    handleCellClick,
    handleKeyDown,
    
    // Editing state
    editingCell,
    setEditingCell,
    
    // Cleanup
    cleanup
  };
};
