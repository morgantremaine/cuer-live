
import { useCallback } from 'react';
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
  // Items management - pass markAsChanged to track changes
  const itemsHook = useRundownItems(markAsChanged);

  // Columns manager - pass markAsChanged to track changes
  const columnsManager = useColumnsManager(markAsChanged);

  // Auto-save with the current state - this should be the ONLY auto-save call
  const autoSaveResult = useAutoSave(
    itemsHook.items,
    rundownTitle,
    columnsManager.columns,
    timezone,
    rundownStartTime
  );

  // Enhanced updateItem to handle both standard and custom fields
  const updateItem = useCallback((id: string, field: string, value: string) => {
    if (!Array.isArray(itemsHook.items) || itemsHook.items.length === 0) {
      return;
    }

    const item = itemsHook.items.find(i => i.id === id);
    if (!item) return;

    // Handle custom fields vs standard fields
    if (field.startsWith('custom_')) {
      itemsHook.updateItem(id, `customFields.${field}`, value);
    } else if (field.startsWith('customFields.')) {
      itemsHook.updateItem(id, field, value);
    } else {
      itemsHook.updateItem(id, field, value);
    }
  }, [itemsHook]);

  // Simple add functions
  const addRow = useCallback(() => {
    itemsHook.addRow('regular');
  }, [itemsHook]);

  const addHeader = useCallback(() => {
    itemsHook.addHeader();
  }, [itemsHook]);

  return {
    // Items
    items: itemsHook.items,
    setItems: itemsHook.setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow: itemsHook.deleteRow,
    deleteMultipleRows: itemsHook.deleteMultipleRows,
    addMultipleRows: itemsHook.addMultipleRows,
    getRowNumber: itemsHook.getRowNumber,
    toggleFloatRow: itemsHook.toggleFloatRow,
    calculateTotalRuntime: itemsHook.calculateTotalRuntime,
    calculateHeaderDuration: itemsHook.calculateHeaderDuration,
    // Columns
    ...columnsManager,
    // Auto-save
    hasUnsavedChanges: autoSaveResult.hasUnsavedChanges,
    isSaving: autoSaveResult.isSaving,
    triggerSave: autoSaveResult.triggerSave
  };
};
