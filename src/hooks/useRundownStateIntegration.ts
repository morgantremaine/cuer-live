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

  // Initialize hooks once and keep them stable
  const [hooksInitialized, setHooksInitialized] = useState(false);
  
  // Items management with change tracking - initialize once
  const itemsHook = useRundownItems(stableMarkAsChanged);
  
  // Columns management - initialize once
  const columnsHook = useColumnsManager(stableMarkAsChanged);

  // Stable values that only change when actual data changes
  const stableItems = useMemo(() => itemsHook.items, [itemsHook.items]);
  const stableColumns = useMemo(() => columnsHook.columns, [columnsHook.columns]);
  
  // Use refs for frequently changing values to prevent re-renders
  const stableTitleRef = useRef(rundownTitle);
  const stableTimezoneRef = useRef(timezone);
  const stableStartTimeRef = useRef(rundownStartTime);
  
  // Only update refs when values actually change
  useEffect(() => {
    stableTitleRef.current = rundownTitle;
  }, [rundownTitle]);
  
  useEffect(() => {
    stableTimezoneRef.current = timezone;
  }, [timezone]);
  
  useEffect(() => {
    stableStartTimeRef.current = rundownStartTime;
  }, [rundownStartTime]);

  // Change tracking - only create once and keep stable
  const changeTracking = useChangeTracking(
    stableItems, 
    stableTitleRef.current, 
    stableColumns, 
    stableTimezoneRef.current, 
    stableStartTimeRef.current
  );

  // Auto-save integration - only create once
  const autoSave = useAutoSave(
    stableItems,
    stableTitleRef.current,
    changeTracking.hasUnsavedChanges && changeTracking.isInitialized,
    changeTracking.markAsSaved,
    stableColumns,
    stableTimezoneRef.current,
    stableStartTimeRef.current,
    getUndoHistory
  );

  // Mark hooks as initialized on first render
  useEffect(() => {
    if (!hooksInitialized) {
      setHooksInitialized(true);
    }
  }, [hooksInitialized]);

  // Memoize wrapped functions to prevent recreation
  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    itemsHook.addRow(calculateEndTime, insertAfterIndex);
  }, [itemsHook.addRow]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
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
