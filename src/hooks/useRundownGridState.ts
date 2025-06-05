
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

  // Create adapter functions to bridge interface gaps
  const adaptedAddRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    // Convert from insertAfterIndex pattern to selectedRows pattern
    // If we have an insertAfterIndex, we can ignore it since the core addRow uses selectedRows
    coreState.addRow(calculateEndTime, interactions.selectedRows);
  }, [coreState.addRow, coreState.calculateEndTime, interactions.selectedRows]);

  const adaptedAddHeader = useCallback((insertAfterIndex?: number) => {
    // Convert from insertAfterIndex pattern to selectedRows pattern
    // If we have an insertAfterIndex, we can ignore it since the core addHeader uses selectedRows
    coreState.addHeader(interactions.selectedRows);
  }, [coreState.addHeader, interactions.selectedRows]);

  // Row operations with adapted interfaces
  const { handleDeleteSelectedRows } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: adaptedAddRow,
    addHeader: adaptedAddHeader,
    calculateEndTime: coreState.calculateEndTime
  });

  // Memoize the complete state object
  return useMemo(() => ({
    // Core state
    ...coreState,
    // Interaction handlers - include all expected properties
    ...interactions,
    // UI state
    ...uiState,
    // Override with adapted functions that match component expectations
    handleAddRow: adaptedAddRow,
    handleAddHeader: adaptedAddHeader,
    // Clipboard functionality
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows,
    // Add missing drag and drop properties that components expect
    draggedItemIndex: interactions.draggedItems?.length > 0 ? 0 : -1,
    isDraggingMultiple: interactions.isDragging && interactions.selectedRows.size > 1,
    dropTargetIndex: interactions.dragOverIndex || -1,
    // Add missing handler properties
    handleUpdateItem: interactions.updateItem,
    handleRowSelection: interactions.toggleRowSelection,
    handleDragLeave: interactions.handleDragLeave || (() => {}),
    // Add missing selection methods
    toggleRowSelection: interactions.toggleRowSelection
  }), [
    coreState,
    interactions,
    uiState,
    adaptedAddRow,
    adaptedAddHeader,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  ]);
};
