
import { useCallback } from 'react';
import { useRundownHandlers } from '@/hooks/useRundownHandlers';

interface UseRundownGridHandlersProps {
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string) => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (items: any[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  handleDeleteColumn: (columnId: string) => void;
  setItems: (updater: (prev: any[]) => any[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  selectColor: (id: string, color: string, updateItem: (id: string, field: string, value: string) => void) => void;
  markAsChanged: () => void;
  selectedRows: Set<string>;
  clearSelection: () => void;
  copyItems: (items: any[]) => void;
  clipboardItems: any[];
  hasClipboardData: () => boolean;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, items: any[]) => void;
  items: any[];
  setRundownTitle: (title: string) => void;
}

export const useRundownGridHandlers = ({
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
  markAsChanged,
  selectedRows,
  clearSelection,
  copyItems,
  clipboardItems,
  hasClipboardData,
  toggleRowSelection,
  items,
  setRundownTitle
}: UseRundownGridHandlersProps) => {
  
  const {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  } = useRundownHandlers({
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
  });

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
    clearSelection();
  }, [items, selectedRows, copyItems, clearSelection]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
    markAsChanged();
  }, [setRundownTitle, markAsChanged]);

  const handlePasteRowsWithClipboard = useCallback(() => {
    handlePasteRows(clipboardItems, hasClipboardData, selectedRows);
  }, [handlePasteRows, clipboardItems, hasClipboardData, selectedRows]);

  const handleDeleteSelectedRowsWithClear = useCallback(() => {
    handleDeleteSelectedRows(selectedRows, clearSelection);
  }, [handleDeleteSelectedRows, selectedRows, clearSelection]);

  return {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows: handleDeleteSelectedRowsWithClear,
    handlePasteRows: handlePasteRowsWithClipboard,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  };
};
