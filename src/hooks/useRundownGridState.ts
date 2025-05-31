
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useCallback, useState, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownGridState = () => {
  // Get core state and functionality
  const coreState = useRundownGridCore();
  
  // Local clipboard state
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);

  // Stable color selection function
  const handleColorSelection = useCallback((id: string, color: string) => {
    console.log('Selecting color for item:', id, color);
    coreState.updateItem(id, 'color', color);
    coreState.markAsChanged();
  }, [coreState.updateItem, coreState.markAsChanged]);

  // Get interaction handlers - use core functions directly
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

  // Get UI state
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
      // Generate a new clean ID without affecting the description
      cleanItem.id = `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return cleanItem;
    });
    setClipboardItems(copiedItems);
    console.log('Items copied to clipboard:', copiedItems.length);
  }, []);

  const hasClipboardData = useCallback(() => {
    return clipboardItems.length > 0;
  }, [clipboardItems]);

  // Direct copy/paste handlers
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = coreState.items.filter(item => interactions.selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      interactions.clearSelection();
    }
  }, [coreState.items, interactions.selectedRows, copyItems, interactions.clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      console.log('Pasting items from clipboard:', clipboardItems.length);
      // Create clean copies for pasting
      const itemsToPaste = clipboardItems.map(item => ({
        ...item,
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      }));
      coreState.addMultipleRows(itemsToPaste, coreState.calculateEndTime);
      coreState.markAsChanged();
    } else {
      console.log('No clipboard data to paste');
    }
  }, [clipboardItems, coreState.addMultipleRows, coreState.calculateEndTime, coreState.markAsChanged]);

  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(interactions.selectedRows);
    if (selectedIds.length > 0) {
      console.log('Deleting selected rows:', selectedIds);
      coreState.deleteMultipleRows(selectedIds);
      interactions.clearSelection();
    }
  }, [interactions.selectedRows, coreState.deleteMultipleRows, interactions.clearSelection]);

  // Wrapped add functions with proper logging
  const wrappedAddRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    console.log('Adding new row at index:', insertAfterIndex);
    coreState.addRow(calculateEndTime, insertAfterIndex);
  }, [coreState.addRow]);

  const wrappedAddHeader = useCallback((insertAfterIndex?: number) => {
    console.log('Adding new header at index:', insertAfterIndex);
    coreState.addHeader(insertAfterIndex);
  }, [coreState.addHeader]);

  // Memoize the return object to prevent unnecessary re-renders
  const returnValue = useMemo(() => ({
    ...coreState,
    ...interactions,
    ...uiState,
    // Override with wrapped functions
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    // Override with our direct implementations
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  }), [
    coreState,
    interactions,
    uiState,
    wrappedAddRow,
    wrappedAddHeader,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  ]);

  return returnValue;
};
