
import { useCallback, useEffect } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useSimpleChangeTracking } from './useSimpleChangeTracking';
import { useSimpleAutoSave } from './useSimpleAutoSave';
import { useSimpleDataLoader } from './useSimpleDataLoader';
import { useRundownStorage } from './useRundownStorage';
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

  // Get storage functionality
  const { savedRundowns, loading } = useRundownStorage();

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

  // Data loader with proper integration
  const dataLoader = useSimpleDataLoader({
    savedRundowns,
    loading,
    setRundownTitle: () => {}, // Will be handled by parent
    setTimezone: () => {}, // Will be handled by parent
    setRundownStartTime: () => {}, // Will be handled by parent
    handleLoadLayout: columnsHook.handleLoadLayout,
    setItems: itemsHook.setItems,
    setIsLoading,
    onRundownLoaded: (rundown) => {
      console.log('Simple rundown state: Rundown loaded callback triggered for:', rundown.id);
      // Initialize change tracking after data is loaded
      setTimeout(() => {
        initialize(itemsHook.items, rundownTitle, columnsHook.columns, timezone, rundownStartTime);
      }, 500);
    }
  });

  // Reset change tracking when no rundown ID
  useEffect(() => {
    if (!rundownId && isInitialized) {
      console.log('Simple rundown state: No rundown ID, resetting change tracking');
      reset();
    }
  }, [rundownId, isInitialized, reset]);

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
