
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
  // Debounced markAsChanged to prevent rapid auto-save during resize
  const markAsChangedTimeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedMarkAsChanged = useCallback(() => {
    if (markAsChangedTimeoutRef.current) {
      clearTimeout(markAsChangedTimeoutRef.current);
    }
    
    markAsChangedTimeoutRef.current = setTimeout(() => {
      markAsChanged();
    }, 500); // 500ms debounce for auto-save
  }, [markAsChanged]);

  // Enhanced column width callback that triggers debounced auto-save
  const handleColumnWidthChangeWithSave = useCallback((columnId: string, width: number) => {
    console.log('🔄 Column width change detected in GridUI:', { columnId, width });
    // The column width change will be handled by the columns manager
    // We just need to ensure markAsChanged is called (debounced)
    debouncedMarkAsChanged();
  }, [debouncedMarkAsChanged]);

  // Resizable columns
  const {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  } = useResizableColumns(columns, handleColumnWidthChangeWithSave);

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
    if (currentTimeString >= item.startTime && currentTimeString < item.endTime) return 'completed';
    return 'completed';
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
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
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
