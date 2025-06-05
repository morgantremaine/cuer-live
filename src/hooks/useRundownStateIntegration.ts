import { useMemo, useCallback, useRef, useState, useEffect } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { useChangeTracking } from './useChangeTracking';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void,
  getUndoHistory?: () => any[]
) => {
  // Stable version of markAsChanged
  const stableMarkAsChangedRef = useRef(markAsChanged);
  stableMarkAsChangedRef.current = markAsChanged;
  
  const stableMarkAsChanged = useCallback(() => {
    stableMarkAsChangedRef.current();
  }, []);

  // Track initialization state to prevent overwrites
  const [hooksInitialized, setHooksInitialized] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // Initialize hooks once and keep them stable
  const itemsHook = useRundownItems(stableMarkAsChanged);
  
  // Columns management - initialize once
  const columnsHook = useColumnsManager(stableMarkAsChanged);

  // Stable values that only change when actual data changes
  const stableItems = useMemo(() => itemsHook.items, [itemsHook.items]);
  const stableColumns = useMemo(() => columnsHook.columns, [columnsHook.columns]);
  
  // Change tracking - stable throughout component lifecycle
  const changeTracking = useChangeTracking(
    stableItems, 
    rundownTitle, 
    stableColumns, 
    timezone, 
    rundownStartTime
  );

  // Auto-save integration - simplified with stable dependencies
  const autoSave = useAutoSave(
    stableItems,
    rundownTitle,
    changeTracking.hasUnsavedChanges && changeTracking.isInitialized && !isInitializing,
    changeTracking.markAsSaved,
    stableColumns,
    timezone,
    rundownStartTime,
    getUndoHistory
  );

  // Mark initialization as complete after a reasonable delay
  useEffect(() => {
    if (!hooksInitialized) {
      setHooksInitialized(true);
      // Allow some time for data loading to complete
      const timer = setTimeout(() => {
        console.log('State integration: Initialization period ended, enabling auto-save');
        setIsInitializing(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [hooksInitialized]);

  // Memoize wrapped functions to prevent recreation
  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    console.log('State integration: Adding row');
    itemsHook.addRow(calculateEndTime, insertAfterIndex);
  }, [itemsHook.addRow]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    console.log('State integration: Adding header');
    itemsHook.addHeader(insertAfterIndex);
  }, [itemsHook.addHeader]);

  return {
    items: stableItems,
    setItems: itemsHook.setItems,
    updateItem: itemsHook.updateItem,
    addRow,
    addHeader,
    deleteRow: itemsHook.deleteRow,
    deleteMultipleRows: itemsHook.deleteMultipleRows,
    addMultipleRows: itemsHook.addMultipleRows,
    getRowNumber: itemsHook.getRowNumber,
    toggleFloatRow: itemsHook.toggleFloatRow,
    calculateTotalRuntime: itemsHook.calculateTotalRuntime,
    calculateHeaderDuration: itemsHook.calculateHeaderDuration,
    columns: stableColumns,
    visibleColumns: columnsHook.visibleColumns,
    handleAddColumn: columnsHook.handleAddColumn,
    handleReorderColumns: columnsHook.handleReorderColumns,
    handleDeleteColumn: columnsHook.handleDeleteColumn,
    handleRenameColumn: columnsHook.handleRenameColumn,
    handleToggleColumnVisibility: columnsHook.handleToggleColumnVisibility,
    handleLoadLayout: columnsHook.handleLoadLayout,
    handleUpdateColumnWidth: columnsHook.handleUpdateColumnWidth,
    hasUnsavedChanges: changeTracking.hasUnsavedChanges,
    isSaving: autoSave.isSaving
  };
};
