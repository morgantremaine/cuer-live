import { useState, useCallback, useRef, useMemo } from 'react';
import { useSimpleColumnWidths } from './useSimpleColumnWidths';
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
  markAsChanged: () => void,
  handleUpdateColumnWidth?: (columnId: string, width: string) => void
) => {
  // Debounced markAsChanged to prevent rapid auto-save during resize
  const markAsChangedTimeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedMarkAsChanged = useCallback(() => {
    if (markAsChangedTimeoutRef.current) {
      clearTimeout(markAsChangedTimeoutRef.current);
    }
    
    markAsChangedTimeoutRef.current = setTimeout(() => {
      markAsChanged();
    }, 300); // 300ms debounce for auto-save
  }, [markAsChanged]);

  // Simple column widths with immediate callback
  const {
    updateColumnWidth,
    getColumnWidth
  } = useSimpleColumnWidths(
    columns, 
    (columnId: string, width: number) => {
      // Trigger debounced auto-save when column width changes
      debouncedMarkAsChanged();
    },
    handleUpdateColumnWidth // Pass the column update function
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
    // Column management - simplified
    updateColumnWidth,
    getColumnWidth,
    
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
