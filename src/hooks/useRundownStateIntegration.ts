
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
      originalUpdateItem(id, `customFields.${field}`, value);
    } else if (field.startsWith('customFields.')) {
      originalUpdateItem(id, field, value);
    } else {
      originalUpdateItem(id, field, value);
    }
  }, [originalUpdateItem, items]);

  // Columns manager
  const columnsManager = useColumnsManager(markAsChanged);

  // Auto-save with simplified dependency
  const { hasUnsavedChanges, isSaving } = useAutoSave(
    items,
    rundownTitle,
    columnsManager.columns,
    timezone,
    rundownStartTime
  );

  // Wrapped functions
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
