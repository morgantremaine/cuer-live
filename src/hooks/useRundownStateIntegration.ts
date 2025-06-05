
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
    if (field.startsWith('custom_')) {
      // For custom columns, store the value in customFields using the column ID
      const currentCustomFields = item.customFields || {};
      originalUpdateItem(id, 'customFields', JSON.stringify({
        ...currentCustomFields,
        [field]: value
      }));
    } else if (field.startsWith('customFields.')) {
      const customFieldKey = field.replace('customFields.', '');
      const currentCustomFields = item.customFields || {};
      originalUpdateItem(id, 'customFields', JSON.stringify({
        ...currentCustomFields,
        [customFieldKey]: value
      }));
    } else {
      // Handle standard fields
      originalUpdateItem(id, field, value);
    }
  }, [originalUpdateItem, items]);

  // Memoize columns manager to prevent re-creation
  const columnsManager = useMemo(() => {
    return useColumnsManager(markAsChanged);
  }, [markAsChanged]);

  // Auto-save functionality
  const { hasUnsavedChanges, isSaving } = useAutoSave(
    Array.isArray(items) ? items : [],
    rundownTitle,
    Array.isArray(columnsManager.columns) ? columnsManager.columns : [],
    timezone,
    rundownStartTime
  );

  // Wrapped addRow that supports insertion at specific index
  const addRow = useCallback((insertAfterIndex?: number) => {
    originalAddRow('regular');
  }, [originalAddRow]);

  // Wrapped addHeader that supports insertion at specific index  
  const addHeader = useCallback((insertAfterIndex?: number) => {
    originalAddHeader(insertAfterIndex);
  }, [originalAddHeader]);

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
    ...columnsManager,
    hasUnsavedChanges,
    isSaving
  };
};
