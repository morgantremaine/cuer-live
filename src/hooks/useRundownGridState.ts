
import { useMemo } from 'react';
import { useRundownCore } from './useRundownCore';
import { useRundownUI } from './useRundownUI';
import { useRundownOperations } from './useRundownOperations';

export const useRundownGridState = () => {
  // Get core state and data
  const coreState = useRundownCore();
  
  // Get UI interactions
  const uiState = useRundownUI(
    coreState.items,
    coreState.setItems,
    coreState.columns,
    coreState.handleUpdateColumnWidth
  );
  
  // Get operations
  const operations = useRundownOperations(
    coreState.items,
    coreState.setItems,
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteMultipleRows,
    coreState.addMultipleRows,
    coreState.toggleFloatRow,
    coreState.rundownStartTime,
    uiState.selectedRows,
    uiState.clearSelection,
    uiState.clipboardItems,
    uiState.copyItems,
    uiState.hasClipboardData,
    coreState.markAsChanged,
    coreState.handleUndo,
    coreState.canUndo,
    coreState.lastAction
  );

  // Row selection handler
  const handleRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    uiState.toggleRowSelection(itemId, index, isShiftClick, isCtrlClick, coreState.items);
  };

  // Update item handler
  const handleUpdateItem = (id: string, field: string, value: string) => {
    coreState.updateItem(id, field, value);
  };

  // Cell navigation handlers (simplified)
  const handleCellClick = () => {
    // Simple implementation
  };

  const handleKeyDown = () => {
    // Simple implementation
  };

  // Standardized add functions that handle both interface patterns
  const handleAddRow = () => {
    operations.handleAddRow(operations.calculateEndTime, undefined, uiState.selectedRows);
  };

  const handleAddHeader = () => {
    operations.handleAddHeader(undefined, uiState.selectedRows);
  };

  return useMemo(() => ({
    // Core state
    ...coreState,
    
    // UI state
    ...uiState,
    
    // Operations
    ...operations,
    
    // Combined handlers
    handleRowSelection,
    handleUpdateItem,
    handleCellClick,
    handleKeyDown,
    
    // Standardized handlers that work with both interface patterns
    handleAddRow,
    handleAddHeader,
    
    // Additional handlers for compatibility
    onUpdateItem: handleUpdateItem,
    onRowSelect: handleRowSelection,
    onAddRow: handleAddRow,
    onAddHeader: handleAddHeader,
    onDeleteSelectedRows: operations.handleDeleteSelectedRows,
    onCopySelectedRows: operations.handleCopySelectedRows,
    onPasteRows: operations.handlePasteRows,
    onToggleColorPicker: uiState.handleToggleColorPicker,
    onColorSelect: operations.handleColorSelect,
    onToggleFloat: operations.handleToggleFloat,
    onDragStart: uiState.handleDragStart,
    onDragOver: uiState.handleDragOver,
    onDragLeave: uiState.handleDragLeave,
    onDrop: uiState.handleDrop,
    onClearSelection: uiState.clearSelection,
    
    // Missing property mappings
    selectColor: operations.handleColorSelect,
    handleUndo: operations.handleUndo,
    canUndo: operations.canUndo,
    lastAction: operations.lastAction
  }), [
    coreState,
    uiState,
    operations,
    handleRowSelection,
    handleUpdateItem,
    handleAddRow,
    handleAddHeader
  ]);
};
