
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

  // Enhanced updateItem to handle both standard and custom fields properly
  const updateItem = useCallback((id: string, field: string, value: string) => {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const item = items.find(i => i.id === id);
    if (!item) return;

    // Handle custom fields vs standard fields
    if (field.startsWith('custom_')) {
      // For custom columns, store the value in customFields using the column ID
      const currentCustomFields = item.customFields || {};
      const updatedCustomFields = {
        ...currentCustomFields,
        [field]: value
      };
      originalUpdateItem(id, 'customFields', updatedCustomFields);
    } else if (field.startsWith('customFields.')) {
      // Handle nested custom field updates
      const customFieldKey = field.replace('customFields.', '');
      const currentCustomFields = item.customFields || {};
      const updatedCustomFields = {
        ...currentCustomFields,
        [customFieldKey]: value
      };
      originalUpdateItem(id, 'customFields', updatedCustomFields);
    } else {
      // Handle standard fields normally
      originalUpdateItem(id, field, value);
    }
  }, [originalUpdateItem, items]);

  // Stable columns manager
  const columnsManager = useColumnsManager(markAsChanged);

  // Auto-save functionality
  const { hasUnsavedChanges, isSaving } = useAutoSave(
    items,
    rundownTitle,
    columnsManager.columns,
    timezone,
    rundownStartTime
  );

  // Wrapped functions that don't interfere with typing
  const addRow = useCallback((insertAfterIndex?: number) => {
    originalAddRow('regular');
  }, [originalAddRow]);

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
    ...columnsManager,
    hasUnsavedChanges,
    isSaving
  };
};
