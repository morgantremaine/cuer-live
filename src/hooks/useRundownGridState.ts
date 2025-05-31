
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useCallback, useState, useMemo, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownGridState = () => {
  // Get core state and functionality
  const coreState = useRundownGridCore();
  
  // Local clipboard state
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);
  
  // Stable refs to prevent infinite loops
  const stableUpdateItemRef = useRef(coreState.updateItem);
  const stableMarkAsChangedRef = useRef(coreState.markAsChanged);
  
  // Update refs when core functions change
  stableUpdateItemRef.current = coreState.updateItem;
  stableMarkAsChangedRef.current = coreState.markAsChanged;

  // Stable color selection function
  const handleColorSelection = useCallback((id: string, color: string) => {
    console.log('Applying color to item:', id, color);
    stableUpdateItemRef.current(id, 'color', color);
    stableMarkAsChangedRef.current();
  }, []);

  // Get interaction handlers - use stable references
  const interactions = useRundownGridInteractions(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloatRow,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.handleDeleteColumn,
    coreState.calculateEndTime,
    handleColorSelection,
    coreState.markAsChanged,
    coreState.setRundownTitle
  );

  // Get UI state with stable color function
  const uiState = useRundownGridUI(
    coreState.items,
    coreState.visibleColumns,
    coreState.columns,
    coreState.updateItem,
    coreState.currentSegmentId,
    coreState.currentTime,
    coreState.markAsChanged
  );

  // Simple clipboard functions with clean data
  const copyItems = useCallback((items: RundownItem[]) => {
    const copiedItems = items.map(item => {
      const cleanItem = { ...item };
      cleanItem.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return cleanItem;
    });
    setClipboardItems(copiedItems);
  }, []);

  const hasClipboardData = useMemo(() => {
    return clipboardItems.length > 0;
  }, [clipboardItems.length]);

  // Direct copy/paste handlers with stable dependencies
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = coreState.items.filter(item => interactions.selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      interactions.clearSelection();
    }
  }, [coreState.items, interactions.selectedRows, copyItems, interactions.clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      const selectedIds = Array.from(interactions.selectedRows);
      let insertAfterIndex: number | undefined;
      
      if (selectedIds.length > 0) {
        const selectedIndices = selectedIds.map(id => 
          coreState.items.findIndex(item => item.id === id)
        ).filter(index => index !== -1);
        
        if (selectedIndices.length > 0) {
          insertAfterIndex = Math.max(...selectedIndices);
        }
      }

      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      
      if (insertAfterIndex !== undefined) {
        coreState.setItems(prevItems => {
          const newItems = [...prevItems];
          newItems.splice(insertAfterIndex! + 1, 0, ...itemsToPaste);
          return newItems;
        });
      } else {
        coreState.addMultipleRows(itemsToPaste, coreState.calculateEndTime);
      }
      
      coreState.markAsChanged();
    }
  }, [clipboardItems, interactions.selectedRows, coreState.items, coreState.setItems, coreState.addMultipleRows, coreState.calculateEndTime, coreState.markAsChanged]);

  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(interactions.selectedRows);
    if (selectedIds.length > 0) {
      coreState.deleteMultipleRows(selectedIds);
      interactions.clearSelection();
    }
  }, [interactions.selectedRows, coreState.deleteMultipleRows, interactions.clearSelection]);

  // Wrapped add functions
  const wrappedAddRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    coreState.addRow(calculateEndTime, insertAfterIndex);
  }, [coreState.addRow]);

  const wrappedAddHeader = useCallback((insertAfterIndex?: number) => {
    coreState.addHeader(insertAfterIndex);
  }, [coreState.addHeader]);

  // Override the UI state's selectColor with our stable version
  const stableUIState = useMemo(() => ({
    ...uiState,
    selectColor: handleColorSelection
  }), [uiState, handleColorSelection]);

  // Memoize the return object with stable references
  return useMemo(() => ({
    ...coreState,
    ...interactions,
    ...stableUIState,
    // Override with wrapped functions
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    // Clipboard functionality
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  }), [
    coreState,
    interactions,
    stableUIState,
    wrappedAddRow,
    wrappedAddHeader,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  ]);
};
