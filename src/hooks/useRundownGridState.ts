
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
  
  // Create an adapter function that converts between the two calculateEndTime signatures
  const adaptedCalculateEndTime = useCallback((item: any, prevEndTime?: string) => {
    const startTime = prevEndTime || item.startTime || '00:00:00';
    const duration = item.duration || '00:00:30';
    return coreState.calculateEndTime(startTime, duration);
  }, [coreState.calculateEndTime]);
  
  // Clipboard operations that integrate with rundown state
  const { handleCopySelectedRows, handlePasteRows } = useRundownClipboardOperations({
    items: coreState.items,
    setItems: coreState.setItems,
    selectedRows: interactions.selectedRows,
    clearSelection: interactions.clearSelection,
    addMultipleRows: (items: any[], calculateEndTime: (startTime: string, duration: string) => string) => {
      coreState.addMultipleRows(items, undefined, adaptedCalculateEndTime);
    },
    calculateEndTime: coreState.calculateEndTime,
    markAsChanged: coreState.markAsChanged,
    clipboardItems,
    copyItems,
    hasClipboardData
  });

  // Create properly wrapped functions that use selected rows for insertion
  const handleAddRow = useCallback(() => {
    // Find the highest index among selected rows for insertion
    let insertAfterIndex: number | undefined = undefined;
    if (interactions.selectedRows && interactions.selectedRows.size > 0) {
      const selectedIndices = Array.from(interactions.selectedRows).map(id => 
        coreState.items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
        console.log('Grid state: Inserting row after index:', insertAfterIndex);
      }
    }
    
    // Call addRow with the adapted calculateEndTime function and insertion index
    coreState.addRow(adaptedCalculateEndTime, insertAfterIndex);
  }, [coreState.addRow, adaptedCalculateEndTime, interactions.selectedRows, coreState.items]);

  const handleAddHeader = useCallback(() => {
    // Find the highest index among selected rows for insertion
    let insertAfterIndex: number | undefined = undefined;
    if (interactions.selectedRows && interactions.selectedRows.size > 0) {
      const selectedIndices = Array.from(interactions.selectedRows).map(id => 
        coreState.items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
        console.log('Grid state: Inserting header after index:', insertAfterIndex);
      }
    }
    
    // Call addHeader with insertion index
    coreState.addHeader(insertAfterIndex);
  }, [coreState.addHeader, interactions.selectedRows, coreState.items]);

  // Row operations with properly wrapped functions
  const { handleDeleteSelectedRows } = useRundownRowOperations({
    selectedRows: interactions.selectedRows,
    deleteMultipleRows: coreState.deleteMultipleRows,
    clearSelection: interactions.clearSelection,
    addRow: handleAddRow,
    addHeader: handleAddHeader,
    calculateEndTime: coreState.calculateEndTime
  });

  // Create handleUndo function
  const handleUndo = useCallback(() => {
    if (coreState.undo && coreState.setItems && coreState.handleLoadLayout && coreState.setRundownTitleDirectly) {
      const action = coreState.undo(coreState.setItems, (cols) => coreState.handleLoadLayout(cols), coreState.setRundownTitleDirectly);
      if (action) {
        coreState.markAsChanged();
        console.log(`Undid: ${action}`);
      }
    }
  }, [coreState]);

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
    handleUndo,
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
    handleUndo,
    clipboardItems,
    copyItems,
    hasClipboardData,
    handleCopySelectedRows,
    handlePasteRows,
    handleDeleteSelectedRows
  ]);
};
