import { useState, useRef, useCallback } from 'react';
import { useColorPicker } from './useColorPicker';
import { useEditingState } from './useEditingState';
import { useCellNavigation } from './useCellNavigation';
import { CalculatedRundownItem } from '@/utils/rundownCalculations';
import { Column } from '@/hooks/useColumnsManager';

export const useRundownUIManager = (
  items: CalculatedRundownItem[],
  visibleColumns: Column[],
  columns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  markAsChanged: () => void,
  handleUpdateColumnWidth?: (columnId: string, width: number, isManualResize?: boolean, resetToAutoSize?: boolean) => void
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

  // Smart Column Width Management - separates manual resize from auto-sizing
  const getColumnWidth = useCallback((column: Column) => {
    // Phase 1: If manually resized, use exact manual width
    if (column.manuallyResized && column.manualWidth) {
      console.log(`📏 Using manual width for ${column.key}: ${column.manualWidth}px`);
      return `${column.manualWidth}px`;
    }
    
    // Phase 2: Smart auto-sizing for non-manually-resized columns
    const naturalWidth = column.width || '150px';
    const naturalWidthValue = parseInt(naturalWidth.replace('px', ''));
    
    // Calculate total width of manually resized columns
    let manuallyResizedWidth = 64; // Row number column
    let autoSizedColumns: Column[] = [];
    let autoSizedTotalNaturalWidth = 0;
    
    columns.forEach(col => {
      if (col.manuallyResized && col.manualWidth) {
        manuallyResizedWidth += col.manualWidth;
      } else {
        autoSizedColumns.push(col);
        const colWidth = col.width || '150px';
        autoSizedTotalNaturalWidth += parseInt(colWidth.replace('px', ''));
      }
    });
    
    const viewportWidth = window.innerWidth;
    const totalCurrentWidth = manuallyResizedWidth + autoSizedTotalNaturalWidth;
    
    // Phase 3: Only expand auto-sized columns if there's extra space
    if (totalCurrentWidth < viewportWidth && autoSizedColumns.length > 0) {
      const extraSpace = viewportWidth - manuallyResizedWidth;
      const proportion = naturalWidthValue / autoSizedTotalNaturalWidth;
      const expandedWidth = Math.floor(extraSpace * proportion);
      
      return `${Math.max(naturalWidthValue, expandedWidth)}px`;
    }
    
    return naturalWidth;
  }, [columns]);

  const updateColumnWidth = useCallback((columnId: string, width: number, isManualResize: boolean = true) => {
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
      // Pass resize information to the parent handler
      handleUpdateColumnWidth(column?.id || '', constrainedWidth, isManualResize);
    }
  }, [columns, debouncedMarkAsChanged, handleUpdateColumnWidth]);

  // Function to reset a column to auto-sizing
  const resetColumnToAutoSize = useCallback((columnId: string) => {
    if (handleUpdateColumnWidth) {
      handleUpdateColumnWidth(columnId, 0, false, true); // 0 width, not manual, reset flag
    }
  }, [handleUpdateColumnWidth]);

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
    resetColumnToAutoSize,
    
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
