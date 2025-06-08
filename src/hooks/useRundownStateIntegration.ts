
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
  isProcessingRealtimeUpdate?: boolean
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

  // Enhanced updateItem to handle both standard and custom fields
  const updateItem = useCallback((id: string, field: string, value: string) => {
    // Ensure items is an array before finding
    if (!Array.isArray(items)) {
      console.error('Items is not an array in updateItem:', items);
      return;
    }

    const item = items.find(i => i.id === id);
    if (!item) return;

    // Handle custom fields vs standard fields
    if (field.startsWith('customFields.')) {
      const customFieldKey = field.replace('customFields.', '');
      const currentCustomFields = item.customFields || {};
      originalUpdateItem(id, {
        customFields: {
          ...currentCustomFields,
          [customFieldKey]: value
        }
      });
    } else {
      // Handle standard fields
      originalUpdateItem(id, { [field]: value });
    }
  }, [originalUpdateItem, items]);

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

  // Auto-save functionality with realtime awareness
  const { hasUnsavedChanges, isSaving, setApplyingRemoteUpdate, updateSavedSignature } = useAutoSave(
    Array.isArray(items) ? items : [],
    rundownTitle,
    Array.isArray(columns) ? columns : [],
    timezone,
    rundownStartTime,
    isProcessingRealtimeUpdate
  );

  // Wrapped addRow that supports insertion at specific index but compatible with expected signature
  const addRow = useCallback((calculateEndTime: any, selectedRowId?: string) => {
    // Convert selectedRowId to insertAfterIndex if needed
    let insertAfterIndex: number | undefined;
    if (selectedRowId && items) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    originalAddRow(calculateEndTime, insertAfterIndex);
  }, [originalAddRow, items]);

  // Wrapped addHeader that supports insertion at specific index but compatible with expected signature
  const addHeader = useCallback((selectedRowId?: string) => {
    // Convert selectedRowId to insertAfterIndex if needed
    let insertAfterIndex: number | undefined;
    if (selectedRowId && items) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    originalAddHeader(insertAfterIndex);
  }, [originalAddHeader, items]);

  return {
    items: Array.isArray(items) ? items : [],
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
    columns: Array.isArray(columns) ? columns : [],
    visibleColumns: Array.isArray(visibleColumns) ? visibleColumns : [],
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving,
    setApplyingRemoteUpdate,
    updateSavedSignature
  };
};
