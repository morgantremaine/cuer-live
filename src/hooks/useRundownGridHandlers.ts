
import { useCallback } from 'react';
import { useRundownHandlers } from '@/hooks/useRundownHandlers';

interface UseRundownGridHandlersProps {
  updateItem: (id: string, field: string, value: string) => void;
  addRow: (calculateEndTime: (startTime: string, duration: string) => string, selectedRows?: Set<string>) => void;
  addHeader: (selectedRows?: Set<string>) => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (items: any[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  handleDeleteColumn: (columnId: string) => void;
  setItems: (updater: (prev: any[]) => any[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  selectColor: (id: string, color: string) => void;
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
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup
  } = useRundownHandlers({
    updateItem,
    addRow: (calcFn) => addRow(calcFn, selectedRows),
    addHeader: () => addHeader(selectedRows),
    deleteRow,
    toggleFloatRow,
    deleteMultipleRows,
    addMultipleRows,
    handleDeleteColumn,
    setItems,
    calculateEndTime,
    selectColor: (id: string, color: string, updateItemFn: (id: string, field: string, value: string) => void) => {
      selectColor(id, color);
    },
    markAsChanged
  });

  const handleAddRow = useCallback(() => {
    console.log('Grid handlers: Adding row with selected rows:', selectedRows.size);
    addRow(calculateEndTime, selectedRows);
    markAsChanged();
  }, [addRow, calculateEndTime, selectedRows, markAsChanged]);

  const handleAddHeader = useCallback(() => {
    console.log('Grid handlers: Adding header with selected rows:', selectedRows.size);
    addHeader(selectedRows);
    markAsChanged();
  }, [addHeader, selectedRows, markAsChanged]);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      console.log('Copied items to clipboard:', selectedItems.length);
      clearSelection();
    }
  }, [items, selectedRows, copyItems, clearSelection]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
    markAsChanged();
  }, [setRundownTitle, markAsChanged]);

  const handlePasteRowsWithClipboard = useCallback(() => {
    if (hasClipboardData() && clipboardItems.length > 0) {
      console.log('Pasting items from clipboard:', clipboardItems.length);
      addMultipleRows(clipboardItems, calculateEndTime);
      markAsChanged();
    } else {
      console.log('No clipboard data to paste');
    }
  }, [hasClipboardData, clipboardItems, addMultipleRows, calculateEndTime, markAsChanged]);

  const handleDeleteSelectedRowsWithClear = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

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
