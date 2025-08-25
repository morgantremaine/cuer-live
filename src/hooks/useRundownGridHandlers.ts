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
  toggleRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, items: RundownItem[], headerGroupItemIds?: string[]) => void;
  items: RundownItem[];
  setRundownTitle: (title: string) => void;
  addRowAtIndex: (insertIndex: number) => void;
  addHeaderAtIndex: (insertIndex: number) => void;
  markLocalStructuralChange?: () => void;
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
  markLocalStructuralChange
}: UseRundownGridHandlersProps) => {

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
  }, [updateItem]);

  // Enhanced addRow that considers selection state and inserts after selected rows
  const handleAddRow = useCallback(() => {
    console.log('🚀 Grid handlers addRow called');
    console.log('🚀 Current selection state - selectedRows size:', selectedRows.size);
    
    // Trigger local processing state for visual smoothness
    if (markLocalStructuralChange) {
      markLocalStructuralChange();
    }
    
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
  }, [addRowAtIndex, addRow, selectedRows, items, markLocalStructuralChange]);

  // Enhanced addHeader that considers selection state and inserts after selected rows  
  const handleAddHeader = useCallback(() => {
    console.log('🚀 Grid handlers addHeader called');
    console.log('🚀 Current selection state - selectedRows size:', selectedRows.size);
    
    // Trigger local processing state for visual smoothness
    if (markLocalStructuralChange) {
      markLocalStructuralChange();
    }
    
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
  }, [addHeaderAtIndex, addHeader, selectedRows, items, markLocalStructuralChange]);

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
      // Trigger local processing state for visual smoothness
      if (markLocalStructuralChange) {
        markLocalStructuralChange();
      }
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection, markLocalStructuralChange]);

  const handlePasteRows = useCallback((targetRowId?: string) => {
    if (clipboardItems.length > 0) {
      console.log('Grid handlers: pasting with targetRowId:', targetRowId);
      
      // Trigger local processing state for visual smoothness
      if (markLocalStructuralChange) {
        markLocalStructuralChange();
      }
      
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
  }, [clipboardItems, items, setItems, markAsChanged, markLocalStructuralChange]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
  }, [handleDeleteColumn]);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
  }, [items, selectedRows, copyItems]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
    console.log('🎯 handleRowSelection called:', { itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds });
    console.log('🎯 Current selectedRows state:', Array.from(selectedRows));
    
    // If this is a collapsed header with group items, handle group selection/deselection
    if (headerGroupItemIds && headerGroupItemIds.length > 1 && !isShiftClick && !isCtrlClick) {
      console.log('🎯 Handling header group:', headerGroupItemIds);
      
      // Check if all items in the group are currently selected
      const allGroupItemsSelected = headerGroupItemIds.every(id => {
        const isSelected = selectedRows.has(id);
        console.log('🎯 Checking item:', id, 'isSelected:', isSelected);
        return isSelected;
      });
      console.log('🎯 Selection check result:', { 
        headerGroupItemIds, 
        selectedRows: Array.from(selectedRows), 
        allGroupItemsSelected 
      });
      
      if (allGroupItemsSelected) {
        // Deselect the entire group
        console.log('🎯 Deselecting entire header group');
        clearSelection();
      } else {
        // Select the entire group
        console.log('🎯 Selecting entire header group');
        // Clear existing selection first
        clearSelection();
        headerGroupItemIds.forEach(id => {
          const itemIndex = items.findIndex(item => item.id === id);
          if (itemIndex !== -1) {
            toggleRowSelection(id, itemIndex, false, true, items, headerGroupItemIds);
          }
        });
      }
    } else {
      // Normal single/multi selection
      console.log('🎯 Calling toggleRowSelection with headerGroupItemIds:', headerGroupItemIds);
      toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items, headerGroupItemIds);
    }
  }, [items, toggleRowSelection, clearSelection]);

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
