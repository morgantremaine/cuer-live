
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
  
  // More defensive filtering - only proceed if we have a valid ID
  const rundownId = rawId && rawId !== ':id' && rawId.trim() !== '' ? rawId : undefined;

  console.log('Simple rundown state: Current rundown ID:', rundownId, 'from params:', rawId, 'pathname:', window.location.pathname);

  // If we don't have a rundown ID, we shouldn't initialize any rundown functionality
  if (!rundownId) {
    console.log('Simple rundown state: No valid rundown ID, returning minimal state');
    
    // Return a minimal state that won't cause errors
    const itemsHook = useRundownItems(() => {}); // No-op change handler
    const columnsHook = useColumnsManager(() => {}); // No-op change handler
    
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
      
      // State - all false/disabled when no rundown ID
      hasUnsavedChanges: false,
      isSaving: false,
      isInitialized: false,
      setIsLoading: () => {},
      markAsChanged: () => {}
    };
  }

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

  // Auto-save - only call when we have a valid rundown ID
  const { isSaving } = useSimpleAutoSave(
    rundownId, // Will be undefined for invalid routes
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
    hasUnsavedChanges: rundownId ? hasUnsavedChanges : false,
    isSaving: rundownId ? isSaving : false,
    isInitialized,
    setIsLoading,
    markAsChanged
  };
};
