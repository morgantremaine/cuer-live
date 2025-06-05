
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
    updateItem: originalUpdateItem,
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

  // Create a wrapper for updateItem to match expected signature (id, field, value)
  const updateItem = useCallback((id: string, field: string, value: string) => {
    originalUpdateItem(id, { [field]: value });
  }, [originalUpdateItem]);

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

  // Change tracking - fix: pass items array instead of string
  const { hasUnsavedChanges } = useChangeTracking(
    rundownTitle,
    items, // This should be RundownItem[], not string
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
    isSaving: false // Add the missing isSaving property
  };
};
