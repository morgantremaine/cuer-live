
import { useMemo, useCallback, useRef } from 'react';
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
  // Use refs to track if hooks have been initialized to prevent recreation
  const hooksInitializedRef = useRef(false);
  const stableMarkAsChangedRef = useRef(markAsChanged);
  stableMarkAsChangedRef.current = markAsChanged;

  // Stable mark as changed function
  const stableMarkAsChanged = useCallback(() => {
    stableMarkAsChangedRef.current();
  }, []);

  // Items management with change tracking - initialize once
  const itemsHook = useRundownItems(stableMarkAsChanged);
  
  // Columns management - initialize once
  const columnsHook = useColumnsManager(stableMarkAsChanged);

  // Create stable values that don't change unless the actual data changes
  const stableItems = useMemo(() => itemsHook.items, [itemsHook.items]);
  const stableColumns = useMemo(() => columnsHook.columns, [columnsHook.columns]);
  const stableTitle = useMemo(() => rundownTitle, [rundownTitle]);
  const stableTimezone = useMemo(() => timezone, [timezone]);
  const stableStartTime = useMemo(() => rundownStartTime, [rundownStartTime]);

  // Change tracking - only initialize once per hook lifecycle
  const changeTracking = useChangeTracking(stableItems, stableTitle, stableColumns, stableTimezone, stableStartTime);

  // Auto-save integration - only initialize if change tracking is ready
  const autoSave = useAutoSave(
    stableItems,
    stableTitle,
    changeTracking.hasUnsavedChanges && changeTracking.isInitialized,
    changeTracking.markAsSaved,
    stableColumns,
    stableTimezone,
    stableStartTime,
    getUndoHistory
  );

  // Mark hooks as initialized after first render
  if (!hooksInitializedRef.current) {
    hooksInitializedRef.current = true;
  }

  // Stable wrapped functions - memoize to prevent recreation
  const addRow = useMemo(() => {
    return (calculateEndTime: any, insertAfterIndex?: number) => {
      itemsHook.addRow(calculateEndTime, insertAfterIndex);
    };
  }, [itemsHook.addRow]);

  const addHeader = useMemo(() => {
    return (insertAfterIndex?: number) => {
      itemsHook.addHeader(insertAfterIndex);
    };
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
