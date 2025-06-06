
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useStableRundownRealtime } from './useStableRundownRealtime';
import { useSimpleEditingDetection } from './useSimpleEditingDetection';
import { useCallback, useEffect, useMemo } from 'react';
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

  // Storage functionality
  const { savedRundowns, loading, updateRundown, loadRundowns } = useRundownStorage();

  // Simple editing detection
  const { isEditing, markAsEditing } = useSimpleEditingDetection();

  // Set up realtime collaboration (only when we have a rundown ID)
  const { isConnected } = useStableRundownRealtime({
    rundownId,
    enabled: !!rundownId
  });

  console.log('🔴 GridCore realtime status:', {
    rundownId,
    isConnected,
    isEditing
  });

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

  // Undo functionality with persistence
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo();

  // Use data loader with undo history loading
  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezone: setTimezoneDirectly,
    setRundownStartTime: setRundownStartTimeDirectly,
    handleLoadLayout,
    setItems,
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

  // Enhanced functions that trigger editing detection and save state
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    markAsEditing();
    updateItem(id, field, value);
  }, [updateItem, markAsEditing]);

  // Wrapped functions that save state before making changes
  const wrappedAddRow = useCallback((calculateEndTimeFn: any, selectedRowId?: string | null, selectedRows?: Set<string>) => {
    saveState(items, columns, rundownTitle, 'Add Row');
    markAsEditing();
    
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    } else if (selectedRowId) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    if (insertAfterIndex !== undefined) {
      addRow(calculateEndTimeFn, insertAfterIndex);
    } else {
      addRow(calculateEndTimeFn);
    }
  }, [addRow, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedAddHeader = useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
    saveState(items, columns, rundownTitle, 'Add Header');
    markAsEditing();
    
    let insertAfterIndex: number | undefined = undefined;
    if (selectedRows && selectedRows.size > 0) {
      const selectedIndices = Array.from(selectedRows).map(id => 
        items.findIndex(item => item.id === id)
      ).filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        insertAfterIndex = Math.max(...selectedIndices);
      }
    } else if (selectedRowId) {
      const selectedIndex = items.findIndex(item => item.id === selectedRowId);
      if (selectedIndex !== -1) {
        insertAfterIndex = selectedIndex;
      }
    }
    
    if (insertAfterIndex !== undefined) {
      addHeader(insertAfterIndex);
    } else {
      addHeader();
    }
  }, [addHeader, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedDeleteRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Delete Row');
    markAsEditing();
    deleteRow(id);
  }, [deleteRow, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    saveState(items, columns, rundownTitle, 'Delete Multiple Rows');
    markAsEditing();
    deleteMultipleRows(ids);
  }, [deleteMultipleRows, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    saveState(items, columns, rundownTitle, 'Toggle Float');
    markAsEditing();
    toggleFloatRow(id);
  }, [toggleFloatRow, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedSetItems = useCallback((updater: (prev: RundownItem[]) => RundownItem[]) => {
    const newItems = typeof updater === 'function' ? updater(items) : updater;
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      saveState(items, columns, rundownTitle, 'Move Rows');
      markAsEditing();
    }
    setItems(updater);
  }, [setItems, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedAddMultipleRows = useCallback((newItems: RundownItem[], calculateEndTimeFn: any) => {
    saveState(items, columns, rundownTitle, 'Paste Rows');
    markAsEditing();
    addMultipleRows(newItems);
  }, [addMultipleRows, saveState, items, columns, rundownTitle, markAsEditing]);

  const wrappedSetRundownTitle = useCallback((title: string) => {
    if (title !== rundownTitle) {
      saveState(items, columns, rundownTitle, 'Change Title');
      markAsEditing();
    }
    setRundownTitle(title);
  }, [setRundownTitle, saveState, items, columns, rundownTitle, markAsEditing]);

  const handleUndo = useCallback(() => {
    const action = undo(setItems, handleLoadLayout, setRundownTitleDirectly);
    if (action) {
      markAsChanged();
      markAsEditing();
      console.log(`Undid: ${action}`);
    }
  }, [undo, setItems, handleLoadLayout, setRundownTitleDirectly, markAsChanged, markAsEditing]);

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
    updateItem: enhancedUpdateItem,
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
    lastAction,

    // Realtime status
    isConnected,
    isEditing
  };
};
