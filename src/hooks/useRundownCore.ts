
import { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownItems } from './useRundownItems';
import { useColumnsManager } from './useColumnsManager';
import { useChangeTracking } from './useChangeTracking';
import { useRundownStorage } from './useRundownStorage';
import { useAutoSave } from './useAutoSave';
import { useRundownUndo } from './useRundownUndo';

export const useRundownCore = () => {
  const params = useParams<{ id: string }>();
  const rawId = params.id;
  const rundownId = rawId === ':id' || !rawId || rawId.trim() === '' ? undefined : rawId;
  
  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Live Broadcast Rundown');
  const [timezone, setTimezone] = useState('America/New_York'); 
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time
  useState(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  });

  const markAsChanged = useCallback(() => {
    // Mark that changes have been made
  }, []);

  // Change tracking
  const { hasUnsavedChanges, markAsSaved, setIsLoading } = useChangeTracking(
    [], // Will be updated with actual items
    rundownTitle,
    [], // Will be updated with actual columns
    timezone,
    rundownStartTime
  );

  // Items management
  const {
    items,
    setItems,
    updateItem,
    addRow: originalAddRow,
    addHeader: originalAddHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  } = useRundownItems(markAsChanged);

  // Columns management
  const {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleRenameColumn,
    handleUpdateColumnWidth
  } = useColumnsManager(markAsChanged);

  // Storage
  const { savedRundowns, loading, updateRundown } = useRundownStorage();

  // Undo functionality
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId,
    updateRundown,
    currentTitle: rundownTitle,
    currentItems: items,
    currentColumns: columns
  });

  // Standardized functions with undo support - use insertAfterIndex pattern
  const wrappedAddRow = useCallback((insertAfterIndex?: number) => {
    saveState(items, columns, rundownTitle, 'Add Row');
    originalAddRow((startTime: string, duration: string) => {
      // Simple time calculation
      const [hours, minutes, seconds] = startTime.split(':').map(Number);
      const [durHours, durMinutes, durSeconds] = duration.split(':').map(Number);
      
      const totalSeconds = (hours * 3600 + minutes * 60 + seconds) + 
                          (durHours * 3600 + durMinutes * 60 + durSeconds);
      
      const endHours = Math.floor(totalSeconds / 3600);
      const endMinutes = Math.floor((totalSeconds % 3600) / 60);
      const endSecs = totalSeconds % 60;
      
      return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}:${endSecs.toString().padStart(2, '0')}`;
    }, insertAfterIndex);
  }, [originalAddRow, saveState, items, columns, rundownTitle]);

  const wrappedAddHeader = useCallback((insertAfterIndex?: number) => {
    saveState(items, columns, rundownTitle, 'Add Header');
    originalAddHeader(insertAfterIndex);
  }, [originalAddHeader, saveState, items, columns, rundownTitle]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    saveState(items, columns, rundownTitle, 'Delete Multiple Rows');
    deleteMultipleRows(ids);
  }, [deleteMultipleRows, saveState, items, columns, rundownTitle]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Toggle Float');
    toggleFloatRow(id);
  }, [toggleFloatRow, saveState, items, columns, rundownTitle]);

  const wrappedSetItems = useCallback((updater: (prev: any[]) => any[]) => {
    const newItems = typeof updater === 'function' ? updater(items) : updater;
    // Only save state if items actually changed
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      saveState(items, columns, rundownTitle, 'Move Rows');
    }
    setItems(updater);
  }, [setItems, saveState, items, columns, rundownTitle]);

  const wrappedAddMultipleRows = useCallback((newItems: any[], calculateEndTimeFn: any) => {
    saveState(items, columns, rundownTitle, 'Paste Rows');
    addMultipleRows(newItems, calculateEndTimeFn);
  }, [addMultipleRows, saveState, items, columns, rundownTitle]);

  const handleUndo = useCallback(() => {
    const action = undo(setItems, (cols) => handleLoadLayout(cols), setRundownTitle);
    if (action) {
      markAsChanged();
      console.log(`Undid: ${action}`);
    }
  }, [undo, setItems, handleLoadLayout, setRundownTitle, markAsChanged]);

  // Auto-save
  const { isSaving } = useAutoSave({
    rundownId,
    rundownTitle,
    items,
    columns,
    timezone,
    rundownStartTime,
    hasUnsavedChanges,
    markAsSaved,
    setIsLoading
  });

  return {
    // Basic state
    rundownId,
    rundownTitle,
    setRundownTitle,
    timezone,
    setTimezone,
    rundownStartTime,
    setRundownStartTime,
    currentTime,
    
    // Data
    items,
    setItems: wrappedSetItems,
    updateItem,
    columns,
    visibleColumns,
    
    // Operations with standardized signatures
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    deleteRow,
    deleteMultipleRows: wrappedDeleteMultipleRows,
    addMultipleRows: wrappedAddMultipleRows,
    toggleFloatRow: wrappedToggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    
    // Column management
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleRenameColumn,
    handleUpdateColumnWidth,
    
    // Storage
    savedRundowns,
    loading,
    hasUnsavedChanges,
    isSaving,
    markAsChanged,
    markAsSaved,
    
    // Undo functionality
    handleUndo,
    canUndo,
    lastAction
  };
};
