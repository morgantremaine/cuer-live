
import { useRundownUIState } from './useRundownUIState';
import { useCellNavigation } from './useCellNavigation';
import { useColorPicker } from './useColorPicker';
import { useRef } from 'react';
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
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

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

  const {
    handleCellNavigation
  } = useCellNavigation(items);

  // Create wrapper functions for compatibility
  const handleCellClick = (itemId: string, field: string) => {
    // Focus the specific cell
    const cellKey = `${itemId}-${field}`;
    const element = cellRefs.current[cellKey];
    if (element) {
      element.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    handleCellNavigation(e, itemId, field);
  };

  return {
    showColorPicker,
    handleToggleColorPicker,
    getColumnWidth,
    updateColumnWidth,
    getRowStatus,
    selectColor,
    handleCellClick,
    handleKeyDown,
    cellRefs
  };
};
