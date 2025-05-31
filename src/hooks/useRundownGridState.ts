
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

  console.log('useRundownGridState: items count:', coreState.items.length);

  // Memoize the core functions to prevent re-creation on every render
  // Only depend on items array and primitive values, not functions
  const stableCoreState = useMemo(() => ({
    items: coreState.items,
    setItems: coreState.setItems,
    updateItem: coreState.updateItem,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    deleteRow: coreState.deleteRow,
    toggleFloatRow: coreState.toggleFloatRow,
    deleteMultipleRows: coreState.deleteMultipleRows,
    addMultipleRows: coreState.addMultipleRows,
    handleDeleteColumn: coreState.handleDeleteColumn,
    calculateEndTime: coreState.calculateEndTime,
    markAsChanged: coreState.markAsChanged,
    setRundownTitle: coreState.setRundownTitle
  }), [coreState.items]); // Only depend on items array

  // Stable color select function
  const selectColor = useCallback((id: string, color: string) => {
    console.log('Selecting color for item:', id, color);
    stableCoreState.updateItem(id, 'color', color);
    stableCoreState.markAsChanged();
  }, [stableCoreState.updateItem, stableCoreState.markAsChanged]);

  // Get interaction handlers - use stable core functions
  const interactions = useRundownGridInteractions(
    stableCoreState.items,
    stableCoreState.setItems,
    stableCoreState.updateItem,
    stableCoreState.addRow,
    stableCoreState.addHeader,
    stableCoreState.deleteRow,
    stableCoreState.toggleFloatRow,
    stableCoreState.deleteMultipleRows,
    stableCoreState.addMultipleRows,
    stableCoreState.handleDeleteColumn,
    stableCoreState.calculateEndTime,
    selectColor,
    stableCoreState.markAsChanged,
    stableCoreState.setRundownTitle
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

  // Simple clipboard functions
  const copyItems = useCallback((items: RundownItem[]) => {
    const copiedItems = items.map(item => ({
      ...item,
      id: `copy_${Date.now()}_${Math.random()}`
    }));
    setClipboardItems(copiedItems);
    console.log('Items copied to clipboard:', copiedItems.length);
  }, []);

  const hasClipboardData = useCallback(() => {
    return clipboardItems.length > 0;
  }, [clipboardItems]);

  // Direct copy/paste handlers
  const handleCopySelectedRows = useCallback(() => {
    const selectedItems = stableCoreState.items.filter(item => interactions.selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      interactions.clearSelection();
    }
  }, [stableCoreState.items, interactions.selectedRows, copyItems, interactions.clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      console.log('Pasting items from clipboard:', clipboardItems.length);
      stableCoreState.addMultipleRows(clipboardItems, stableCoreState.calculateEndTime);
      stableCoreState.markAsChanged();
    } else {
      console.log('No clipboard data to paste');
    }
  }, [clipboardItems, stableCoreState.addMultipleRows, stableCoreState.calculateEndTime, stableCoreState.markAsChanged]);

  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(interactions.selectedRows);
    if (selectedIds.length > 0) {
      console.log('Deleting selected rows:', selectedIds);
      stableCoreState.deleteMultipleRows(selectedIds);
      interactions.clearSelection();
    }
  }, [interactions.selectedRows, stableCoreState.deleteMultipleRows, interactions.clearSelection]);

  // Wrapped add functions with proper logging
  const wrappedAddRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    console.log('Adding new row at index:', insertAfterIndex);
    coreState.addRow(calculateEndTime, insertAfterIndex);
  }, [coreState.addRow]);

  const wrappedAddHeader = useCallback((insertAfterIndex?: number) => {
    console.log('Adding new header at index:', insertAfterIndex);
    coreState.addHeader(insertAfterIndex);
  }, [coreState.addHeader]);

  return {
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
  };
};
