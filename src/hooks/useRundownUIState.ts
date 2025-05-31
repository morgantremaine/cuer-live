
import { useCallback } from 'react';
import { useColorPicker } from './useColorPicker';
import { useCellNavigation } from './useCellNavigation';
import { useResizableColumns } from './useResizableColumns';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownUIState = (
  items: RundownItem[],
  visibleColumns: Column[],
  columns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  currentSegmentId: string | null,
  currentTime: Date,
  markAsChanged: () => void
) => {
  // Color picker
  const { showColorPicker, handleToggleColorPicker } = useColorPicker();

  // Cell navigation - fix the function call to use correct order: columns first, then items
  const { cellRefs, handleCellClick, handleKeyDown } = useCellNavigation(
    visibleColumns, 
    items
  );

  // Resizable columns
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(columns);

  // Status calculations
  const getRowStatus = useCallback((item: RundownItem) => {
    if (item.id === currentSegmentId) return 'current';
    
    const now = currentTime;
    const itemStartTime = new Date(`1970-01-01T${item.startTime}`);
    const currentTimeForComparison = new Date(`1970-01-01T${now.toTimeString().split(' ')[0]}`);
    
    return currentTimeForComparison > itemStartTime ? 'completed' : 'upcoming';
  }, [currentSegmentId, currentTime]);

  // Color selection function
  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, color, color);
    markAsChanged();
  }, [updateItem, markAsChanged]);

  return {
    showColorPicker,
    handleToggleColorPicker,
    cellRefs,
    handleCellClick,
    handleKeyDown,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor
  };
};
