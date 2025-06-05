
import { useState, useCallback, useMemo } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { RundownItem } from '@/types/rundown';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void,
  getUndoHistory?: () => any[]
) => {
  // Items management with change tracking
  const {
    items,
    setItems,
    updateItem,
    addRow: originalAddRow,
    addHeader: originalAddHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems(markAsChanged);

  // Columns management
  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth
  } = useColumnsManager(markAsChanged);

  // Stable memoized values to prevent infinite re-renders
  const stableItems = useMemo(() => items, [items]);
  const stableColumns = useMemo(() => columns, [columns]);
  const stableTitle = useMemo(() => rundownTitle, [rundownTitle]);
  const stableTimezone = useMemo(() => timezone, [timezone]);
  const stableStartTime = useMemo(() => rundownStartTime, [rundownStartTime]);

  // Auto-save integration - now uses stable values
  const { hasUnsavedChanges, isSaving, markAsChanged: autoSaveMarkAsChanged } = useAutoSave(
    stableItems,
    stableTitle,
    stableColumns,
    stableTimezone,
    stableStartTime,
    getUndoHistory
  );

  // Wrapped addRow that supports insertion at specific index
  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    originalAddRow(calculateEndTime, insertAfterIndex);
  }, [originalAddRow]);

  // Wrapped addHeader that supports insertion at specific index  
  const addHeader = useCallback((insertAfterIndex?: number) => {
    originalAddHeader(insertAfterIndex);
  }, [originalAddHeader]);

  return {
    items: stableItems,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    columns: stableColumns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving
  };
};
