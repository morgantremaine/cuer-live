
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
    selectColor: (id: string, color: string, updateItemFn: (id: string, field: string, value: string) => void) => {
      selectColor(id, color);
    },
    markAsChanged
  });

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
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
      addMultipleRows(clipboardItems, calculateEndTime);
      markAsChanged();
    }
  }, [hasClipboardData, clipboardItems, addMultipleRows, calculateEndTime, markAsChanged]);

  const handleDeleteSelectedRowsWithClear = useCallback(() => {
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handleAddRowAfter = useCallback((itemId: string) => {
    const targetIndex = items.findIndex(item => item.id === itemId);
    if (targetIndex === -1) return;

    setItems(currentItems => {
      const newItems = [...currentItems];
      const targetItem = newItems[targetIndex];
      
      // Calculate new start time based on the target item's end time
      let newStartTime = targetItem.endTime || '00:00:00';
      
      // Create new row
      const newRow = {
        id: crypto.randomUUID(),
        type: 'regular' as const,
        rowNumber: '',
        name: '',
        startTime: newStartTime,
        duration: '00:00',
        endTime: calculateEndTime(newStartTime, '00:00'),
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        notes: '',
        color: '#ffffff',
        isFloating: false,
        customFields: {}
      };

      // Insert after the target item
      newItems.splice(targetIndex + 1, 0, newRow);
      return newItems;
    });
    
    markAsChanged();
  }, [items, setItems, calculateEndTime, markAsChanged]);

  const handleAddHeaderAfter = useCallback((itemId: string) => {
    const targetIndex = items.findIndex(item => item.id === itemId);
    if (targetIndex === -1) return;

    setItems(currentItems => {
      const newItems = [...currentItems];
      
      // Create new header
      const newHeader = {
        id: crypto.randomUUID(),
        type: 'header' as const,
        rowNumber: '',
        name: 'New Header',
        startTime: '00:00:00',
        duration: '00:00:00',
        endTime: '00:00:00',
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        notes: '',
        color: '#ffffff',
        isFloating: false,
        customFields: {}
      };

      // Insert after the target item
      newItems.splice(targetIndex + 1, 0, newHeader);
      return newItems;
    });
    
    markAsChanged();
  }, [items, setItems, markAsChanged]);

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
    handleTitleChange,
    handleAddRowAfter,
    handleAddHeaderAfter
  };
};
