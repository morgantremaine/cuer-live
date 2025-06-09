
import { useCallback } from 'react';
import { useColorPicker } from './useColorPicker';
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

  // Enhanced column width change handler that triggers auto-save
  const handleColumnWidthChange = useCallback((columnId: string, width: number) => {
    console.log('📏 Column width changed - triggering auto-save:', { columnId, width });
    console.log('🔍 markAsChanged function type:', typeof markAsChanged);
    console.log('🔍 About to call markAsChanged for column resize');
    markAsChanged(); // Trigger auto-save when column width changes
    console.log('✅ markAsChanged called for column width change');
  }, [markAsChanged]);

  // Resizable columns with auto-save integration
  const { getColumnWidth, updateColumnWidth } = useResizableColumns(columns, handleColumnWidthChange);

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
    console.log('Selecting color for item:', id, color);
    updateItem(id, 'color', color);
    markAsChanged();
  }, [updateItem, markAsChanged]);

  return {
    showColorPicker,
    handleToggleColorPicker,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor
  };
};
