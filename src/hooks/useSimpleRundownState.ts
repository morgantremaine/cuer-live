
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
  const rawId = params.id;
  // Apply the same filtering logic as useRundownBasicState
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;

  // Simple change tracking
  const {
    hasUnsavedChanges,
    isInitialized,
    initialize,
    checkForChanges,
    markAsSaved,
    markAsChanged,
    setIsLoading,
    reset
  } = useSimpleChangeTracking();

  // Items management
  const itemsHook = useRundownItems(markAsChanged);
  
  // Columns management
  const columnsHook = useColumnsManager(markAsChanged);

  // Reset change tracking when no rundown ID
  if (!rundownId && isInitialized) {
    reset();
  }

  // Initialize change tracking when data is ready AND we have a valid rundown ID
  if (!isInitialized && itemsHook.items.length > 0 && rundownId) {
    initialize(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
  }

  // Check for changes only if we have a valid rundown ID
  if (rundownId) {
    checkForChanges(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
  }

  // Auto-save - only when we have a valid rundown ID
  // Use conditional hook pattern to completely skip auto-save when no rundown
  const autoSaveResult = rundownId ? useSimpleAutoSave(
    rundownId,
    itemsHook.items,
    rundownTitle,
    columnsHook.columns,
    timezone,
    rundownStartTime,
    hasUnsavedChanges,
    isInitialized,
    markAsSaved
  ) : { isSaving: false };

  const { isSaving } = autoSaveResult;

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
    hasUnsavedChanges: rundownId ? hasUnsavedChanges : false, // No unsaved changes when no rundown
    isSaving: rundownId ? isSaving : false, // Not saving when no rundown
    isInitialized,
    setIsLoading,
    markAsChanged
  };
};
