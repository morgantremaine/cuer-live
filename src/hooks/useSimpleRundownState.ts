
import { useCallback } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useSimpleChangeTracking } from './useSimpleChangeTracking';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useParams } from 'react-router-dom';

export const useSimpleRundownState = (
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string
) => {
  const params = useParams<{ id: string }>();
  const rundownId = params.id;

  // Simple change tracking
  const {
    hasUnsavedChanges,
    isInitialized,
    initialize,
    checkForChanges,
    markAsSaved,
    markAsChanged,
    setIsLoading
  } = useSimpleChangeTracking();

  // Items management
  const itemsHook = useRundownItems(markAsChanged);
  
  // Columns management
  const columnsHook = useColumnsManager(markAsChanged);

  // Initialize change tracking when data is ready
  if (!isInitialized && itemsHook.items.length > 0) {
    initialize(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
  }

  // Check for changes
  checkForChanges(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);

  // Auto-save
  const { isSaving } = useSimpleAutoSave(
    rundownId,
    itemsHook.items,
    rundownTitle,
    columnsHook.columns,
    timezone,
    rundownStartTime,
    hasUnsavedChanges,
    isInitialized,
    markAsSaved
  );

  return {
    // Items
    items: itemsHook.items,
    setItems: itemsHook.setItems,
    updateItem: itemsHook.updateItem,
    addRow: itemsHook.addRow,
    addHeader: itemsHook.addHeader,
    deleteRow: itemsHook.deleteRow,
    deleteMultipleRows: itemsHook.deleteMultipleRows,
    addMultipleRows: itemsHook.addMultipleRows,
    getRowNumber: itemsHook.getRowNumber,
    toggleFloatRow: itemsHook.toggleFloatRow,
    calculateTotalRuntime: itemsHook.calculateTotalRuntime,
    calculateHeaderDuration: itemsHook.calculateHeaderDuration,
    
    // Columns
    columns: columnsHook.columns,
    visibleColumns: columnsHook.visibleColumns,
    handleAddColumn: columnsHook.handleAddColumn,
    handleReorderColumns: columnsHook.handleReorderColumns,
    handleDeleteColumn: columnsHook.handleDeleteColumn,
    handleRenameColumn: columnsHook.handleRenameColumn,
    handleToggleColumnVisibility: columnsHook.handleToggleColumnVisibility,
    handleLoadLayout: columnsHook.handleLoadLayout,
    handleUpdateColumnWidth: columnsHook.handleUpdateColumnWidth,
    
    // State
    hasUnsavedChanges,
    isSaving,
    isInitialized,
    setIsLoading,
    markAsChanged
  };
};
