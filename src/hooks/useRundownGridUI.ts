
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
  const isMarkingChangedRef = useRef(false);
  
  // Enhanced column width callback with separate debouncing for auto-save
  const handleColumnWidthChangeWithSave = useCallback((columnId: string, width: number) => {
    // Prevent rapid fire markAsChanged calls
    if (isMarkingChangedRef.current) return;
    
    // Clear existing timeout
    if (columnWidthTimeoutRef.current) {
      clearTimeout(columnWidthTimeoutRef.current);
    }
    
    isMarkingChangedRef.current = true;
    
    // Debounce the auto-save separately from the visual update - longer for stability
    columnWidthTimeoutRef.current = setTimeout(() => {
      console.log('💾 Auto-save trigger called from column width change');
      markAsChanged();
      isMarkingChangedRef.current = false;
    }, 1000); // Increased from 500ms for more stability
  }, [markAsChanged]);

  // Resizable columns with optimized callback
  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  } = useResizableColumns(columns, handleColumnWidthChangeWithSave);

  // Super aggressive memoization to prevent unnecessary re-renders
  const memoizedGetColumnWidth = useMemo(() => {
    const cachedWidths = new Map<string, string>();
    
    return (column: Column) => {
      const cacheKey = `${column.id}-${column.width}-${columnWidths[column.id] || ''}`;
      
      if (cachedWidths.has(cacheKey)) {
        return cachedWidths.get(cacheKey)!;
      }
      
      const result = getColumnWidth(column);
      cachedWidths.set(cacheKey, result);
      return result;
    };
  }, [getColumnWidth, columnWidths]);

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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (columnWidthTimeoutRef.current) {
        clearTimeout(columnWidthTimeoutRef.current);
      }
      isMarkingChangedRef.current = false;
    };
  }, []);

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
