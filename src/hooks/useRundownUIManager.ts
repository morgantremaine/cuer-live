import { useState, useRef, useCallback } from 'react';
import { useSimpleColumnWidths } from './useSimpleColumnWidths';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { CalculatedRundownItem } from '@/utils/rundownCalculations';
import { Column } from '@/hooks/useUserColumnPreferences';

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

  // Column width management
  const {
    updateColumnWidth,
    getColumnWidth
  } = useSimpleColumnWidths(
    columns, 
    (columnId: string, width: number) => {
      debouncedMarkAsChanged();
    },
    handleUpdateColumnWidth
  );

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
