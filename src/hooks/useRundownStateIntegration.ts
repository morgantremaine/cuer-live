
import { useCallback, useEffect } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';

export const useRundownStateIntegration = (
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string
) => {
  // Items management
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
    calculateHeaderDuration,
    setMarkAsChangedCallback: setItemsMarkAsChangedCallback
  } = useRundownItems();

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
    handleUpdateColumnWidth,
    setMarkAsChangedCallback: setColumnsMarkAsChangedCallback
  } = useColumnsManager();

  // Auto-save functionality
  const { 
    hasUnsavedChanges, 
    isSaving, 
    setRundownId, 
    markAsChanged, 
    setOnRundownCreated 
  } = useAutoSave(
    Array.isArray(items) ? items : [],
    rundownTitle,
    Array.isArray(columns) ? columns : [],
    timezone,
    rundownStartTime
  );

  // Connect the markAsChanged function to both managers
  useEffect(() => {
    setItemsMarkAsChangedCallback(markAsChanged);
    setColumnsMarkAsChangedCallback(markAsChanged);
  }, [markAsChanged, setItemsMarkAsChangedCallback, setColumnsMarkAsChangedCallback]);

  // Enhanced updateItem to handle both standard and custom fields
  const updateItem = useCallback((id: string, field: string, value: string) => {
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

  // Wrapper functions that trigger auto-save
  const addRow = useCallback((calculateEndTime: any, selectedRowId?: string) => {
    originalAddRow(calculateEndTime, selectedRowId);
  }, [originalAddRow]);

  const addHeader = useCallback((selectedRowId?: string) => {
    originalAddHeader(selectedRowId);
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
    setRundownId,
    markAsChanged,
    setOnRundownCreated
  };
};
