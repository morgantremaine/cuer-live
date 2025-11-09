import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { debugLogger } from '@/utils/debugLogger';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { getTabId } from '@/utils/tabUtils';

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
  markStructuralChange?: (operationType: string, operationData: any) => void;
  rundownId?: string;
  currentUserId?: string;
  saveUndoState?: (items: RundownItem[], columns: any[], title: string, action: string) => void;
  columns?: any[];
  title?: string;
  recordOperation?: (operation: { type: string; data: any; description: string }) => void;
  finalizeAllTypingSessions?: () => void;
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
  rundownId,
  currentUserId,
  saveUndoState,
  columns,
  title,
  recordOperation,
  finalizeAllTypingSessions
}: UseRundownGridHandlersProps) => {

  const handleUpdateItem = useCallback((id: string, field: string, value: string) => {
    updateItem(id, field, value);
  }, [updateItem]);

  // Enhanced addRow that considers selection state and inserts after selected rows
  const handleAddRow = useCallback(() => {
    debugLogger.grid('Grid handlers addRow called');
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
        debugLogger.grid('Inserting row at index:', insertIndex);
        addRowAtIndex(insertIndex);
        return;
      }
    }
    
    debugLogger.grid('No selection, using default addRow');
    addRow();
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
      deleteMultipleRows(selectedIds);
      clearSelection();
    }
  }, [selectedRows, deleteMultipleRows, clearSelection]);

  const handlePasteRows = useCallback((targetRowId?: string) => {
    if (clipboardItems.length > 0) {
      debugLogger.grid('Grid handlers: pasting with targetRowId:', targetRowId);
      
      // Finalize any typing sessions before structural change
      if (finalizeAllTypingSessions) {
        finalizeAllTypingSessions();
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
      
      // Record paste operation for undo/redo
      if (recordOperation) {
        console.log('📋 Recording paste operation:', {
          itemCount: itemsToPaste.length,
          insertIndex,
          description: `Paste ${itemsToPaste.length} rows`
        });
        
        recordOperation({
          type: 'add_row',
          data: {
            addedItems: itemsToPaste,
            addedIndex: insertIndex,
            addedItemIds: itemsToPaste.map(item => item.id)
          },
          description: `Paste ${itemsToPaste.length} rows`
        });
      }
      
      setItems(prevItems => {
        const newItems = [...prevItems];
        newItems.splice(insertIndex, 0, ...itemsToPaste);
        return newItems;
      });
      
      // Broadcast copy for immediate realtime sync (dual broadcasting like add_row)
      if (rundownId && currentUserId) {
        cellBroadcast.broadcastCellUpdate(
          rundownId,
          undefined,
          'items:copy',
          { items: itemsToPaste, index: insertIndex },
          currentUserId,
          getTabId()
        );
        debugLogger.grid('📋 Broadcasting copy operation', { itemCount: itemsToPaste.length, insertIndex });
      }
      
      // Use structural save coordination for per-cell mode (database persistence)
      if (markStructuralChange) {
        debugLogger.grid('🧪 STRUCTURAL CHANGE: paste completed - triggering structural coordination');
        markStructuralChange('copy_rows', { newItems: itemsToPaste, insertIndex });
      } else {
        // Fallback for non-per-cell mode
        markAsChanged();
      }
    }
  }, [clipboardItems, items, setItems, markAsChanged, markStructuralChange, recordOperation, finalizeAllTypingSessions]);

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
    
    // If this is a collapsed header with group items, handle group selection/deselection
    if (headerGroupItemIds && headerGroupItemIds.length > 1 && !isShiftClick && !isCtrlClick) {
      debugLogger.grid('Handling header group:', headerGroupItemIds);
      
      // Check if all items in the group are currently selected
      const allGroupItemsSelected = headerGroupItemIds.every(id => {
        const isSelected = selectedRows.has(id);
        debugLogger.grid(`Checking item: ${id}, isSelected: ${isSelected}`);
        return isSelected;
      });
      debugLogger.grid('Selection check result:', { 
        headerGroupItemIds, 
        selectedRows: Array.from(selectedRows), 
        allGroupItemsSelected 
      });
      
      if (allGroupItemsSelected) {
        // Deselect the entire group
        debugLogger.grid('Deselecting entire header group');
        clearSelection();
      } else {
        // Select the entire group
        debugLogger.grid('Selecting entire header group');
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
      debugLogger.grid('Calling toggleRowSelection with headerGroupItemIds:', headerGroupItemIds);
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
