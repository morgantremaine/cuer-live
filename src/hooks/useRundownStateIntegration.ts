
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

  // Enhanced updateItem to handle custom fields properly
  const updateItem = useCallback((id: string, field: string, value: string) => {
    // Handle both standard and custom fields
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

  // Auto-save functionality
  const { hasUnsavedChanges, isSaving } = useAutoSave(
    items,
    rundownTitle,
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
