
import { useCallback } from 'react';
import { useRundownHandlers } from './useRundownHandlers';

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
  selectColor: (id: string, color: string) => void;
  selectedRows: Set<string>;
  clearSelection: () => void;
  copyItems: (items: any[]) => void;
  clipboardItems: any[];
  hasClipboardData: () => boolean;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
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
  selectedRows,
  clearSelection,
  copyItems,
  clipboardItems,
  hasClipboardData,
  toggleRowSelection,
  items,
  setRundownTitle
}: UseRundownGridHandlersProps) => {
  
  // Create a no-op markAsChanged function since auto-save handles change detection automatically
  const markAsChanged = useCallback(() => {
    // Auto-save will detect changes automatically through state monitoring
    console.log('🔔 RundownGridHandlers: Change detected (handled by auto-save)');
  }, []);

  const handlers = useRundownHandlers({
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
    selectColor: (id: string, color: string, updateItemFn: (id: string, field: string, value: string) => void) => {
      selectColor(id, color);
    },
    markAsChanged
  });

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick);
  }, [toggleRowSelection]);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
  }, [items, selectedRows, copyItems]);

  const handlePasteRows = useCallback(() => {
    handlers.handlePasteRows(clipboardItems, hasClipboardData);
  }, [handlers, clipboardItems, hasClipboardData]);

  const handleDeleteSelectedRows = useCallback(() => {
    handlers.handleDeleteSelectedRows(selectedRows, clearSelection);
  }, [handlers, selectedRows, clearSelection]);

  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
  }, [setRundownTitle]);

  return {
    handleUpdateItem: handlers.handleUpdateItem,
    handleAddRow: handlers.handleAddRow,
    handleAddHeader: handlers.handleAddHeader,
    handleDeleteRow: handlers.handleDeleteRow,
    handleToggleFloat: handlers.handleToggleFloat,
    handleColorSelect: handlers.handleColorSelect,
    handleDeleteColumnWithCleanup: handlers.handleDeleteColumnWithCleanup,
    handleRowSelection,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    handleTitleChange
  };
};
