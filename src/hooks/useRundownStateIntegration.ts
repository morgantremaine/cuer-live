
import { useCallback } from 'react';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useAutoSave } from './useAutoSave';
import { RundownItem } from '@/types/rundown';

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
    calculateHeaderDuration
  } = useRundownItems();

  // Columns management - initialize without markAsChanged first
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
    updateMarkAsChanged
  } = useColumnsManager(); // Call without arguments initially

  // Auto-save functionality - now that columns is available
  const { hasUnsavedChanges, isSaving, setRundownId, markAsChanged } = useAutoSave(
    Array.isArray(items) ? items : [],
    rundownTitle,
    Array.isArray(columns) ? columns : [],
    timezone,
    rundownStartTime
  );

  // Update the markAsChanged function in the columns manager
  updateMarkAsChanged(markAsChanged);

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

    // Mark as changed for auto-save
    markAsChanged();
  }, [originalUpdateItem, items, markAsChanged]);

  // Wrapper functions that trigger auto-save
  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    console.log('➕ Adding row');
    originalAddRow(calculateEndTime, insertAfterIndex);
    markAsChanged();
  }, [originalAddRow, markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    console.log('📋 Adding header');
    originalAddHeader(insertAfterIndex);
    markAsChanged();
  }, [originalAddHeader, markAsChanged]);

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
    markAsChanged
  };
};
