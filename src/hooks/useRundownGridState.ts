
import { useMemo } from 'react';
import { useRundownStateCoordination } from './useRundownStateCoordination';
import { useRundownClipboard } from './useRundownClipboard';
import { useRundownClipboardOperations } from './useRundownClipboardOperations';
import { useRundownRowOperations } from './useRundownRowOperations';

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

  // Row operations - now passing calculateEndTime and using correct returned property names
  const { handleDeleteSelectedRows, handleAddRow, handleAddHeader } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    calculateEndTime: coreState.calculateEndTime
  });

  // Memoize the complete state object with multiple triggers as dependencies
  return useMemo(() => ({
    // Core state
    ...coreState,
    // Interaction handlers
    ...interactions,
    // UI state
    ...uiState,
    // Override with wrapped functions - use correct handler names
    handleAddRow,
    handleAddHeader,
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
    handleAddRow,
    handleAddHeader,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    coreState.updateTrigger, // Primary update trigger from realtime sync
    coreState.forceRenderTrigger, // Secondary force render trigger
    coreState.items?.length, // Trigger on items array length change
    JSON.stringify(coreState.items) // Trigger on any items content change
  ]);
};
