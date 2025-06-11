
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { useRundownClipboardOperations } from './useRundownClipboardOperations';

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
  toggleRowSelection: (id: string, isShiftClick?: boolean, isCtrlClick?: boolean) => void;
  items: RundownItem[];
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

  // Use clipboard operations hook
  const { handleCopySelectedRows, handlePasteRows } = useRundownClipboardOperations({
    items,
    setItems,
    selectedRows,
    clearSelection,
    addMultipleRows,
    calculateEndTime,
    markAsChanged,
    clipboardItems,
    copyItems,
    hasClipboardData
  });

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    console.log('🔄 Updating item:', id, field, value);
    updateItem(id, field, value);
  }, [updateItem]);

  const handleAddRow = useCallback(() => {
    console.log('🔄 Adding new row');
    addRow();
  }, [addRow]);

  const handleAddHeader = useCallback(() => {
    console.log('🔄 Adding new header');
    addHeader();
  }, [addHeader]);

  const handleDeleteRow = useCallback((id: string) => {
    console.log('🔄 Deleting row:', id);
    deleteRow(id);
  }, [deleteRow]);

  const handleToggleFloat = useCallback((id: string) => {
    console.log('🔄 Toggling float for row:', id);
    toggleFloatRow(id);
  }, [toggleFloatRow]);

  const handleColorSelect = useCallback((id: string, color: string) => {
    console.log('🔄 Setting color for row:', id, color);
    selectColor(id, color);
  }, [selectColor]);

  const handleDeleteSelectedRows = useCallback(() => {
    console.log('🔄 Deleting selected rows:', Array.from(selectedRows));
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    console.log('🔄 Deleting column:', columnId);
    handleDeleteColumn(columnId);
  }, [handleDeleteColumn]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    console.log('🔄 Row selection:', itemId, { isShiftClick, isCtrlClick });
    toggleRowSelection(itemId, isShiftClick, isCtrlClick);
  }, [toggleRowSelection]);

  const handleTitleChange = useCallback((title: string) => {
    console.log('🔄 Changing title:', title);
    setRundownTitle(title);
  }, [setRundownTitle]);

  // Enhanced paste handler with extra logging
  const enhancedHandlePasteRows = useCallback(() => {
    console.log('🎯 Enhanced paste handler called from grid handlers');
    console.log('📋 Has clipboard data:', hasClipboardData);
    console.log('🎯 Current selection:', Array.from(selectedRows));
    handlePasteRows();
  }, [handlePasteRows, hasClipboardData, selectedRows]);

  return {
    handleUpdateItem,
    handleAddRow,
    handleAddHeader,
    handleDeleteRow,
    handleToggleFloat,
    handleColorSelect,
    handleDeleteSelectedRows,
    handlePasteRows: enhancedHandlePasteRows,
    handleDeleteColumnWithCleanup,
    handleCopySelectedRows,
    handleRowSelection,
    handleTitleChange
  };
};
