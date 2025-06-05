
import { useMemo } from 'react';
import { useRundownStateCoordination } from './useRundownStateCoordination';
import { useRundownClipboard } from './useRundownClipboard';
import { useRundownClipboardOperations } from './useRundownClipboardOperations';
import { useRundownRowOperations } from './useRundownRowOperations';
import { getRowNumber } from '@/utils/sharedRundownUtils';

export const useRundownGridState = () => {
  // Get coordinated state from all subsystems
  const { coreState, interactions, uiState } = useRundownStateCoordination();
  
  // Clipboard management
  const { clipboardItems, copyItems, hasClipboardData } = useRundownClipboard();
  
  // Clipboard operations that integrate with rundown state
  const { handleCopySelectedRows, handlePasteRows } = useRundownClipboardOperations({
    items: coreState.items,
    setItems: coreState.setItems,
    selectedRows: interactions.selectedRows,
    clearSelection: interactions.clearSelection,
    addMultipleRows: coreState.addMultipleRows,
    calculateEndTime: coreState.calculateEndTime,
    markAsChanged: coreState.markAsChanged,
    clipboardItems,
    copyItems,
    hasClipboardData
  });

  // Row operations - create simple handlers for RundownGrid
  const { handleDeleteSelectedRows, handleAddRow: simpleAddRow, handleAddHeader: simpleAddHeader } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    calculateEndTime: coreState.calculateEndTime
  });

  // Use the proper row numbering function from shared utilities
  const getRowNumberForIndex = (index: number) => getRowNumber(index, coreState.items);

  // Memoize the complete state object
  return useMemo(() => ({
    // Core state
    ...coreState,
    // Interaction handlers
    ...interactions,
    // UI state
    ...uiState,
    // Complex handlers for IndexContent (expects calculateEndTime param)
    handleAddRow: interactions.handleAddRow,
    handleAddHeader: interactions.handleAddHeader,
    // Simple handlers for RundownGrid (expects no params)
    onAddRow: simpleAddRow,
    onAddHeader: simpleAddHeader,
    // Override getRowNumber with proper implementation
    getRowNumber: getRowNumberForIndex,
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
    uiState,
    simpleAddRow,
    simpleAddHeader,
    getRowNumberForIndex,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  ]);
};
