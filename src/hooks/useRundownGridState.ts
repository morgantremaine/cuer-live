
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownGridUI } from './useRundownGridUI';
import { useCallback, useState } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownGridState = () => {
  // Get core state and functionality
  const coreState = useRundownGridCore();
  
  // Local clipboard state
  const [clipboardItems, setClipboardItems] = useState<RundownItem[]>([]);

  // Get interaction handlers
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
    (id: string, color: string) => {
      coreState.updateItem(id, 'color', color);
      coreState.markAsChanged();
    },
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
    const selectedItems = coreState.items.filter(item => interactions.selectedRows.has(item.id));
    if (selectedItems.length > 0) {
      copyItems(selectedItems);
      interactions.clearSelection();
    }
  }, [coreState.items, interactions.selectedRows, copyItems, interactions.clearSelection]);

  const handlePasteRows = useCallback(() => {
    if (clipboardItems.length > 0) {
      console.log('Pasting items from clipboard:', clipboardItems.length);
      coreState.addMultipleRows(clipboardItems, coreState.calculateEndTime);
      coreState.markAsChanged();
    } else {
      console.log('No clipboard data to paste');
    }
  }, [clipboardItems, coreState.addMultipleRows, coreState.calculateEndTime, coreState.markAsChanged]);

  const handleDeleteSelectedRows = useCallback(() => {
    const selectedIds = Array.from(interactions.selectedRows);
    if (selectedIds.length > 0) {
      coreState.deleteMultipleRows(selectedIds);
      interactions.clearSelection();
    }
  }, [interactions.selectedRows, coreState.deleteMultipleRows, interactions.clearSelection]);

  return {
    ...coreState,
    ...interactions,
    ...uiState,
    // Override with our direct implementations
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  };
};
