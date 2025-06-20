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
  hasClipboardData: () => boolean;
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, items: RundownItem[]) => void;
  items: RundownItem[];
  setRundownTitle: (title: string) => void;
  addRowAtIndex: (insertIndex: number) => void;
  addHeaderAtIndex: (insertIndex: number) => void;
  jumpToSegment?: (segmentId: string) => void;
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
  addHeaderAtIndex,
  jumpToSegment
}: UseRundownGridHandlersProps) => {

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
  }, [updateItem]);

  // Enhanced addRow that considers selection state and inserts after selected rows
  const handleAddRow = useCallback(() => {
    console.log('🚀 Grid handlers addRow called');
    console.log('🚀 Current selection state - selectedRows size:', selectedRows.size);
    
    // Check if we have any selection
    if (selectedRows.size > 0) {
      console.log('🚀 Using selection for insertion');
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(selectedRows)
        .map(id => items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        const insertIndex = insertAfterIndex + 1;
        console.log('🚀 Inserting row at index:', insertIndex);
        addRowAtIndex(insertIndex);
        return;
      }
    }
    
    console.log('🚀 No selection, using default addRow');
    addRow();
  }, [addRowAtIndex, addRow, selectedRows, items]);

  // Enhanced addHeader that considers selection state and inserts after selected rows  
  const handleAddHeader = useCallback(() => {
    console.log('🚀 Grid handlers addHeader called');
    console.log('🚀 Current selection state - selectedRows size:', selectedRows.size);
    
    // Check if we have any selection
    if (selectedRows.size > 0) {
      console.log('🚀 Using selection for header insertion');
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(selectedRows)
        .map(id => items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        const insertIndex = insertAfterIndex + 1;
        console.log('🚀 Inserting header at index:', insertIndex);
        addHeaderAtIndex(insertIndex);
        return;
      }
    }
    
    console.log('🚀 No selection, using default addHeader');
    addHeader();
  }, [addHeaderAtIndex, addHeader, selectedRows, items]);

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
    const selectedIds = Array.from(selectedRows);
    if (selectedIds.length > 0) {
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handlePasteRows = useCallback((targetRowId?: string) => {
    if (clipboardItems.length > 0) {
      console.log('Grid handlers: pasting with targetRowId:', targetRowId);
      
      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      let insertIndex: number;
      
      if (targetRowId) {
        // Find the target row and insert after it
        const targetIndex = items.findIndex(item => item.id === targetRowId);
        insertIndex = targetIndex !== -1 ? targetIndex + 1 : items.length;
      } else {
        // Fallback to end if no target specified
        insertIndex = items.length;
      }
      
      setItems(prevItems => {
        const newItems = [...prevItems];
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        return newItems;
      });
      
      markAsChanged();
    }
  }, [clipboardItems, items, setItems, markAsChanged]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
  }, [handleDeleteColumn]);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
  }, [items, selectedRows, copyItems]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items);
  }, [toggleRowSelection, items]);

  const handleTitleChange = useCallback((title: string) => {
    setRundownTitle(title);
  }, [setRundownTitle]);

  const handleJumpToHere = useCallback((segmentId: string) => {
    console.log('🎯 Grid handlers: handleJumpToHere called with segmentId:', segmentId);
    if (jumpToSegment) {
      jumpToSegment(segmentId);
    } else {
      console.warn('jumpToSegment function not provided to grid handlers');
    }
  }, [jumpToSegment]);

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
    handleTitleChange,
    handleJumpToHere
  };
};
