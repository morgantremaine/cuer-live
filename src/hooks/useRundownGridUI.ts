
import { useCallback, useEffect } from 'react';
import { useColumnWidthManager } from './useColumnWidthManager';
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
  // Column width management with auto-save integration
  const handleColumnWidthSave = useCallback((columnId: string, width: number) => {
    console.log('💾 Column width changed, triggering auto-save');
    markAsChanged();
  }, [markAsChanged]);

  const {
    getWidth: getColumnWidth,
    setWidth: updateColumnWidth,
    initializeFromColumns
  } = useColumnWidthManager(columns, handleColumnWidthSave);

  // Initialize column widths when columns change
  useEffect(() => {
    initializeFromColumns();
  }, [initializeFromColumns]);

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
    getColumnWidth,
    updateColumnWidth,
    
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
