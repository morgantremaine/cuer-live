
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

  // Row operations - passing the correct calculateEndTime function
  const { handleDeleteSelectedRows, handleAddRow, handleAddHeader } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
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
    // Override with wrapped functions
    handleAddRow,
    handleAddHeader,
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
    handleRowSelection: interactions.selectRow || interactions.toggleRowSelection,
    handleDragLeave: interactions.handleDragLeave || (() => {}),
    // Add missing selection methods
    toggleRowSelection: interactions.toggleRowSelection || interactions.selectRow
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
