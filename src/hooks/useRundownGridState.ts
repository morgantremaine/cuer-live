
import { useMemo, useCallback } from 'react';
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

  // Create properly wrapped functions that match the expected signatures
  const handleAddRow = useCallback(() => {
    // Call addRow with the calculateEndTime function as expected
    coreState.addRow(coreState.calculateEndTime);
  }, [coreState.addRow, coreState.calculateEndTime]);

  const handleAddHeader = useCallback(() => {
    // Call addHeader with no parameters as expected
    coreState.addHeader();
  }, [coreState.addHeader]);

  // Row operations with properly wrapped functions
  const { handleDeleteSelectedRows } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: handleAddRow,
    addHeader: handleAddHeader,
    calculateEndTime: coreState.calculateEndTime
  });

  // Memoize the complete state object with all required properties
  return useMemo(() => ({
    // Core state
    ...coreState,
    // Interaction handlers
    ...interactions,
    // UI state  
    ...uiState,
    // Properly wrapped handlers
    handleAddRow,
    handleAddHeader,
    addRow: handleAddRow, // Alias for compatibility
    addHeader: handleAddHeader, // Alias for compatibility
    // Clipboard functionality
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    // Additional compatibility properties
    draggedItemIndex: interactions.draggedItemIndex || -1,
    isDraggingMultiple: interactions.isDraggingMultiple || false,
    dropTargetIndex: interactions.dropTargetIndex || -1,
    handleUpdateItem: interactions.updateItem,
    handleRowSelection: interactions.toggleRowSelection,
    selectColor: interactions.selectColor,
    clearSelection: interactions.clearSelection
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
    handleDeleteSelectedRows
  ]);
};
