import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useCallback, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownGridCore = () => {
  // Core state management
  const {
    currentTime,
    timezone,
    setTimezone,
    setTimezoneDirectly,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle,
    setRundownTitleDirectly,
    rundownStartTime,
    setRundownStartTime,
    setRundownStartTimeDirectly,
    rundownId,
    markAsChanged
  } = useRundownBasicState();

  // Get storage functionality
  const { savedRundowns, loading, updateRundown } = useRundownStorage();

  // Rundown data integration
  const {
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
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    hasUnsavedChanges,
    isSaving
  } = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    setRundownTitleDirectly, 
    setTimezoneDirectly
  );

  // Undo functionality with persistence - pass current state
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId,
    updateRundown,
    currentTitle: rundownTitle,
    currentItems: items,
    currentColumns: columns
  });

  // Use data loader with undo history loading
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    handleLoadLayout,
    onRundownLoaded: (rundown) => {
      // Load undo history when rundown is loaded
      if (rundown.undo_history) {
        loadUndoHistory(rundown.undo_history);
      }
    }
  });

  // Playback controls
  const { 
    isPlaying, 
    currentSegmentId, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(items, updateItem);

  // Time calculations
  const { calculateEndTime } = useTimeCalculations(items, updateItem, rundownStartTime);

  // Wrapped functions that save state before making changes - update to support insertion after selected row
  const wrappedAddRow = useCallback((calculateEndTimeFn: any, selectedRowId?: string | null) => {
    saveState(items, columns, rundownTitle, 'Add Row');
    
    // Find the index of the selected row if provided
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRowId) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    // Call addRow with the insertion index
    if (insertAfterIndex !== undefined) {
      addRow(calculateEndTimeFn, insertAfterIndex);
    } else {
      addRow(calculateEndTimeFn);
    }
  }, [addRow, saveState, items, columns, rundownTitle]);

  const wrappedAddHeader = useCallback((selectedRowId?: string | null) => {
    saveState(items, columns, rundownTitle, 'Add Header');
    
    // Find the index of the selected row if provided
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRowId) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    // Call addHeader with the insertion index
    if (insertAfterIndex !== undefined) {
      addHeader(insertAfterIndex);
    } else {
      addHeader();
    }
  }, [addHeader, saveState, items, columns, rundownTitle]);

  const wrappedDeleteRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Delete Row');
    deleteRow(id);
  }, [deleteRow, saveState, items, columns, rundownTitle]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    saveState(items, columns, rundownTitle, 'Delete Multiple Rows');
    deleteMultipleRows(ids);
  }, [deleteMultipleRows, saveState, items, columns, rundownTitle]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Toggle Float');
    toggleFloatRow(id);
  }, [toggleFloatRow, saveState, items, columns, rundownTitle]);

  const wrappedSetItems = useCallback((updater: (prev: RundownItem[]) => RundownItem[]) => {
    const newItems = typeof updater === 'function' ? updater(items) : updater;
    // Only save state if items actually changed
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      saveState(items, columns, rundownTitle, 'Move Rows');
    }
    setItems(updater);
  }, [setItems, saveState, items, columns, rundownTitle]);

  const wrappedAddMultipleRows = useCallback((newItems: RundownItem[], calculateEndTimeFn: any) => {
    saveState(items, columns, rundownTitle, 'Paste Rows');
    addMultipleRows(newItems, calculateEndTimeFn);
  }, [addMultipleRows, saveState, items, columns, rundownTitle]);

  const wrappedSetRundownTitle = useCallback((title: string) => {
    if (title !== rundownTitle) {
      saveState(items, columns, rundownTitle, 'Change Title');
    }
    setRundownTitle(title);
  }, [setRundownTitle, saveState, items, columns, rundownTitle]);

  const handleUndo = useCallback(() => {
    const action = undo(setItems, (cols) => handleLoadLayout(cols), setRundownTitleDirectly);
    if (action) {
      markAsChanged();
      console.log(`Undid: ${action}`);
    }
  }, [undo, setItems, handleLoadLayout, setRundownTitleDirectly, markAsChanged]);

  // Keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo) {
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, canUndo]);

  return {
    // Basic state
    currentTime,
    timezone,
    setTimezone,
    showColumnManager,
    setShowColumnManager,
    rundownTitle,
    setRundownTitle: wrappedSetRundownTitle,
    rundownStartTime,
    setRundownStartTime,
    rundownId,
    markAsChanged,

    // Items and data - use wrapped versions for undo support
    items,
    setItems: wrappedSetItems,
    updateItem,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    deleteRow: wrappedDeleteRow,
    deleteMultipleRows: wrappedDeleteMultipleRows,
    addMultipleRows: wrappedAddMultipleRows,
    getRowNumber,
    toggleFloatRow: wrappedToggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration,
    visibleColumns,
    columns,

    // Playback
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,

    // Column management
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,

    // Save state
    hasUnsavedChanges,
    isSaving,
    calculateEndTime,

    // Undo functionality
    handleUndo,
    canUndo,
    lastAction
  };
};
