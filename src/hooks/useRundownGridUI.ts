
import { useRundownUIState } from './useRundownUIState';
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
  const {
    showColorPicker,
    handleToggleColorPicker,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor
  } = useRundownUIState(
    items,
    visibleColumns,
    columns,
    updateItem,
    currentSegmentId,
    currentTime,
    markAsChanged
  );

  return {
    showColorPicker,
    handleToggleColorPicker,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor
  };
};
