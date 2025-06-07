
import { useCallback, useEffect } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { RundownItem } from '@/types/rundown';

export const useRundownStateIntegration = (
  rundownTitle: string,
  timezone: string,
  rundownStartTime: string
) => {
  // Items management - now with no parameters
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

  // Columns management - no parameters needed
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

  // Auto-save functionality - now that columns is available
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

    console.log('🔧 Updating item:', { id, field, value });

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

    // Mark as changed is now handled by the original function
  }, [originalUpdateItem, items]);

  // Wrapper functions that trigger auto-save (now handled internally)
  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    console.log('➕ Adding row');
    originalAddRow(calculateEndTime, insertAfterIndex);
  }, [originalAddRow]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    console.log('📋 Adding header');
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
