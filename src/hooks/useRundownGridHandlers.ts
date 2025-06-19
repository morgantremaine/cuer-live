import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseRundownGridHandlersProps {
  updateItem: (id: string, field: string, value: string) => void;
  addRow: () => void;
  addHeader: () => void;
  deleteRow: (id: string) => void;
  toggleFloatRow: (id: string) => void;
  deleteMultipleRows: (ids: string[]) => void;
  addMultipleRows: (items: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => void;
  handleDeleteColumn: (columnId: string) => void;
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  calculateEndTime: (startTime: string, duration: string) => string;
  selectColor: (id: string, color: string) => void;
  markAsChanged: () => void;
  selectedRows: Set<string>;
  clearSelection: () => void;
  copyItems: (items: RundownItem[]) => void;
  clipboardItems: RundownItem[];
  hasClipboardData: boolean;
  toggleRowSelection: (id: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  items: RundownItem[];
  setRundownTitle: (title: string) => void;
  addRowAtIndex: (insertIndex: number) => void;
  addHeaderAtIndex: (insertIndex: number) => void;
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
  setRundownTitle,
  addRowAtIndex,
  addHeaderAtIndex
}: UseRundownGridHandlersProps) => {

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    console.log('🔧 GridHandlers.handleUpdateItem called:', {
      id,
      field,
      value,
      originalUpdateItem: typeof updateItem
    });
    updateItem(id, field, value);
  }, [updateItem]);

  const handleAddRow = useCallback(() => {
    addRow();
  }, [addRow]);

  const handleAddHeader = useCallback(() => {
    addHeader();
  }, [addHeader]);

  const handleDeleteRow = useCallback((id: string) => {
    deleteRow(id);
  }, [deleteRow]);

  const handleToggleFloat = useCallback((id: string) => {
    toggleFloatRow(id);
  }, [toggleFloatRow]);

  const handleColorSelect = useCallback((id: string, color: string) => {
    selectColor(id, color);
  }, [selectColor]);

  const handleDeleteSelectedRows = useCallback(() => {
    if (selectedRows.size > 0) {
      deleteMultipleRows(Array.from(selectedRows));
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (hasClipboardData && clipboardItems.length > 0) {
      addMultipleRows(clipboardItems, calculateEndTime);
    }
  }, [hasClipboardData, clipboardItems, addMultipleRows, calculateEndTime]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
  }, [handleDeleteColumn]);

  const handleCopySelectedRows = useCallback(() => {
    if (selectedRows.size > 0) {
      const selectedItems = items.filter(item => selectedRows.has(item.id));
      copyItems(selectedItems);
    }
  }, [selectedRows, items, copyItems]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick);
  }, [toggleRowSelection]);

  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
  }, [setRundownTitle]);

  return {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  };
};
