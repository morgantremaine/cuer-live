
import { useCallback } from 'react';
import { RundownItem } from './useRundownItems';

interface UseRundownHandlersProps {
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRowId?: string | null, selectedRows?: Set<string>, count?: number) => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  handleDeleteColumn: (columnId: string) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  selectColor: (id: string, color: string, updateItem: (id: string, field: string, value: string) => void) => void;
  markAsChanged: () => void;
}

export const useRundownHandlers = ({
  updateItem,
  addRow,
  addHeader,
  deleteRow,
  toggleFloatRow,
  deleteMultipleRows,
  addMultipleRows,
  handleDeleteColumn,
  setItems,
  calculateEndTime,
  selectColor,
  markAsChanged
}: UseRundownHandlersProps) => {
  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
    markAsChanged();
  }, [updateItem, markAsChanged]);

  const handleAddRow = useCallback((count?: number) => {
    addRow(calculateEndTime, undefined, undefined, count);
    markAsChanged();
  }, [addRow, calculateEndTime, markAsChanged]);

  const handleAddHeader = useCallback(() => {
    addHeader();
    markAsChanged();
  }, [addHeader, markAsChanged]);

  const handleDeleteRow = useCallback((id: string) => {
    deleteRow(id);
    markAsChanged();
  }, [deleteRow, markAsChanged]);

  const handleToggleFloat = useCallback((id: string) => {
    toggleFloatRow(id);
    markAsChanged();
  }, [toggleFloatRow, markAsChanged]);

  const handleColorSelect = useCallback((id: string, color: string) => {
    selectColor(id, color, updateItem);
    markAsChanged();
  }, [selectColor, updateItem, markAsChanged]);

  const handleDeleteSelectedRows = useCallback(() => {
    // This will be called from the grid handlers with proper parameters
    markAsChanged();
  }, [markAsChanged]);

  const handlePasteRows = useCallback(() => {
    // This will be called from the grid handlers with proper parameters
    markAsChanged();
  }, [markAsChanged]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
    setItems(prev => prev.map(item => {
      if (item.customFields) {
        const { [columnId]: removed, ...rest } = item.customFields;
        return { ...item, customFields: rest };
      }
      return item;
    }));
    markAsChanged();
  }, [handleDeleteColumn, setItems, markAsChanged]);

  return {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  };
};
