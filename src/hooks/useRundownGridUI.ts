
import { useState, useCallback, useRef, useMemo } from 'react';
import { useSimpleColumnWidths } from './useSimpleColumnWidths';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';
import { getRowStatus, CalculatedRundownItem } from '@/utils/rundownCalculations';

export const useRundownGridUI = (
  items: CalculatedRundownItem[],
  visibleColumns: Column[],
  columns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  currentSegmentId: string | null,
  currentTime: Date,
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

  // Simple column widths with immediate callback
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

  // Cell navigation - convert CalculatedRundownItem to RundownItem for compatibility
  const regularItems = useMemo(() => {
    return items.map(item => ({
      ...item,
      startTime: item.calculatedStartTime,
      endTime: item.calculatedEndTime,
      elapsedTime: item.calculatedElapsedTime,
      rowNumber: item.calculatedRowNumber
    }));
  }, [items]);

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

  // Get row status using pure function
  const getRowStatusForItem = useCallback((item: CalculatedRundownItem) => {
    return getRowStatus(item, currentTime);
  }, [currentTime]);

  // Color selection function
  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
  }, [updateItem]);

  // Cleanup timeout on unmount
  useMemo(() => {
    return () => {
      if (markAsChangedTimeoutRef.current) {
        clearTimeout(markAsChangedTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Column management
    updateColumnWidth,
    getColumnWidth,
    
    // Color picker
    showColorPicker,
    handleToggleColorPicker,
    
    // Row status
    getRowStatus: getRowStatusForItem,
    
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
