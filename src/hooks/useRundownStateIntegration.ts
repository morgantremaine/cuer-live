
import { useState, useCallback, useMemo } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from '@/types/rundown';

export const useRundownStateIntegration = (
  markAsChanged: () => void,
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string,
  setRundownTitleDirectly: (title: string) => void,
  setTimezoneDirectly: (timezone: string) => void
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

  // Change tracking
  const { hasUnsavedChanges, isSaving } = useChangeTracking(
    rundownTitle,
    items,
    columns,
    timezone,
    rundownStartTime
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
    items,
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
    columns,
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
