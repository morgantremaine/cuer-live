import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { debugLogger } from '@/utils/debugLogger';

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
  addRowAtIndex: (insertIndex: number, count?: number) => void;
  addHeaderAtIndex: (insertIndex: number) => void;
  markStructuralChange?: (operationType: string, operationData: any) => void;
  isPerCellEnabled?: boolean;
  rundownId?: string | null;
  currentUserId?: string | null;
  // operationHandlers removed - all structural operations now go through state methods
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
  markStructuralChange,
  isPerCellEnabled,
  rundownId,
  currentUserId
  // operationHandlers removed - all structural operations now go through state methods
}: UseRundownGridHandlersProps) => {

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
  }, [updateItem]);

  // Enhanced addRow that considers selection state and inserts after selected rows
  const handleAddRow = useCallback((selectedRowId?: string | null, count?: number) => {
    debugLogger.grid('Grid handlers addRow called', { count });
    debugLogger.grid('Current selection state - selectedRows size:', selectedRows.size);
    
    // Check if we have any selection
    if (selectedRows.size > 0) {
      debugLogger.grid('Using selection for insertion');
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(selectedRows)
        .map(id => items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        const insertIndex = insertAfterIndex + 1;
        debugLogger.grid(`Inserting row at index: ${insertIndex} with count: ${count}`);
        addRowAtIndex(insertIndex, count || 1);
        return;
      }
    }
    
    debugLogger.grid(`No selection, using default addRowAtIndex with count: ${count}`);
    addRowAtIndex(items.length, count || 1);
  }, [addRowAtIndex, addRow, selectedRows, items]);

  // Enhanced addHeader that considers selection state and inserts after selected rows  
  const handleAddHeader = useCallback(() => {
    debugLogger.grid('Grid handlers addHeader called');
    debugLogger.grid('Current selection state - selectedRows size:', selectedRows.size);
    
    // Check if we have any selection
    if (selectedRows.size > 0) {
      debugLogger.grid('Using selection for header insertion');
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(selectedRows)
        .map(id => items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        const insertIndex = insertAfterIndex + 1;
        debugLogger.grid('Inserting header at index:', insertIndex);
        addHeaderAtIndex(insertIndex);
        return;
      }
    }
    
    debugLogger.grid('No selection, using default addHeader');
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
      console.log('🗑️ DELETE OPERATION: Using structural save system', {
        count: selectedIds.length
      });
      
      // Route through state method which calls handleStructuralOperation
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handlePasteRows = useCallback((targetRowId?: string) => {
    console.log('🎯 PASTE: Using structural save system', { 
      targetRowId, 
      clipboardCount: clipboardItems.length
    });
    
    if (clipboardItems.length > 0) {
      debugLogger.grid('Grid handlers: pasting with targetRowId:', targetRowId);
      
      let insertIndex: number;
      
      if (targetRowId) {
        const targetIndex = items.findIndex(item => item.id === targetRowId);
        insertIndex = targetIndex !== -1 ? targetIndex + 1 : items.length;
      } else {
        insertIndex = items.length;
      }
      
      console.log('🎯 PASTE: Inserting', clipboardItems.length, 'items at index', insertIndex);
      
      // Route through state method - paste items
      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      let newItems: RundownItem[];
      setItems(prevItems => {
        newItems = [...prevItems];
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        return newItems;
      });
      
      markAsChanged();
      
      // Trigger structural save coordination if available
      if (markStructuralChange && newItems!) {
        console.log('🧪 STRUCTURAL CHANGE: Paste completed');
        markStructuralChange('copy_rows', { 
          items: newItems!, 
          newItems: itemsToPaste, 
          insertIndex 
        });
      }
      
      clearSelection();
    }
  }, [clipboardItems, items, setItems, markAsChanged, clearSelection, markStructuralChange]);

  const handleDeleteColumnWithCleanup = useCallback((columnId: string) => {
    handleDeleteColumn(columnId);
  }, [handleDeleteColumn]);

  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = items.filter(item => selectedRows.has(item.id));
    copyItems(selectedItems);
  }, [items, selectedRows, copyItems]);

  const handleRowSelection = useCallback((itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
    debugLogger.grid('handleRowSelection called:', { itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds });
    debugLogger.grid('Current selectedRows state:', Array.from(selectedRows));
    
    toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, items, headerGroupItemIds);
  }, [items, toggleRowSelection, selectedRows]);

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
