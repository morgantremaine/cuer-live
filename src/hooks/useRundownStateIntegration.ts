
import { useState, useCallback, useMemo, useEffect } from 'react';
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
  setRundownStartTimeDirectly: (startTime: string) => void,
  setAutoSaveTrigger: (trigger: () => void) => void,
  isProcessingRealtimeUpdate?: boolean
) => {
  console.log('🏗️ useRundownStateIntegration: markAsChanged function type:', typeof markAsChanged);

  // Enhanced markAsChanged that also logs
  const enhancedMarkAsChanged = useCallback(() => {
    console.log('🚀 Enhanced markAsChanged called in state integration');
    markAsChanged();
  }, [markAsChanged]);

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
  } = useRundownItems(enhancedMarkAsChanged);

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

  // Columns management with enhanced markAsChanged
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
  } = useColumnsManager(enhancedMarkAsChanged);

  // Auto-save functionality with realtime awareness
  const { hasUnsavedChanges, isSaving, setApplyingRemoteUpdate, updateSavedSignature, triggerSave } = useAutoSave(
    Array.isArray(items) ? items : [],
    rundownTitle,
    Array.isArray(columns) ? columns : [],
    timezone,
    rundownStartTime,
    isProcessingRealtimeUpdate
  );

  // Connect the auto-save trigger to the basic state
  useEffect(() => {
    if (triggerSave) {
      console.log('🔗 Setting up auto-save trigger connection');
      setAutoSaveTrigger(triggerSave);
    }
  }, [triggerSave, setAutoSaveTrigger]);

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
    updateSavedSignature,
    markAsChanged: enhancedMarkAsChanged
  };
};
