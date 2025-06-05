
import { useCallback, useEffect } from 'react';
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

  console.log('Simple rundown state: Current rundown ID:', rundownId, 'from params:', rawId);

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
  useEffect(() => {
    if (!rundownId && isInitialized) {
      console.log('Simple rundown state: No rundown ID, resetting change tracking');
      reset();
    }
  }, [rundownId, isInitialized, reset]);

  // Initialize change tracking when data is ready AND we have a valid rundown ID
  useEffect(() => {
    if (!rundownId) {
      console.log('Simple rundown state: No rundown ID, skipping initialization');
      return;
    }

    if (isInitialized) {
      console.log('Simple rundown state: Already initialized');
      return;
    }

    if (itemsHook.items.length === 0) {
      console.log('Simple rundown state: No items yet, waiting for data load');
      return;
    }

    console.log('Simple rundown state: Attempting to initialize with rundown ID:', rundownId, 'and', itemsHook.items.length, 'items');
    initialize(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
  }, [rundownId, isInitialized, itemsHook.items.length, rundownTitle, columnsHook.columns, timezone, rundownStartTime, initialize]);

  // Check for changes only if we have a valid rundown ID and are initialized
  useEffect(() => {
    if (rundownId && isInitialized) {
      checkForChanges(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
    }
  }, [rundownId, isInitialized, itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime, checkForChanges]);

  // Auto-save - always call the hook but pass undefined when no rundown
  const { isSaving } = useSimpleAutoSave(
    rundownId, // Can be undefined - hook will handle this
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
    hasUnsavedChanges: rundownId ? hasUnsavedChanges : false, // No unsaved changes when no rundown
    isSaving: rundownId ? isSaving : false, // Not saving when no rundown
    isInitialized,
    setIsLoading,
    markAsChanged
  };
};
