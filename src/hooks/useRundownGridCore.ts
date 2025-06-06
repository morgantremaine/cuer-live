
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useSimpleRealtimeCollaboration } from './useSimpleRealtimeCollaboration';
import { useEditingState } from './useEditingState';
import { usePendingUpdates } from './usePendingUpdates';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownGridCore = () => {
  // Create stable refs to prevent infinite loops
  const stableCallbacksRef = useRef<{
    markAsChanged?: () => void;
    setRundownTitleDirectly?: (title: string) => void;
    setTimezoneDirectly?: (timezone: string) => void;
    setRundownStartTimeDirectly?: (time: string) => void;
    handleLoadLayout?: (layout: any) => void;
    setItems?: (items: RundownItem[]) => void;
    loadRundowns?: () => void;
  }>({});

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

  // Update stable refs when callbacks change
  stableCallbacksRef.current.markAsChanged = markAsChanged;
  stableCallbacksRef.current.setRundownTitleDirectly = setRundownTitleDirectly;
  stableCallbacksRef.current.setTimezoneDirectly = setTimezoneDirectly;
  stableCallbacksRef.current.setRundownStartTimeDirectly = setRundownStartTimeDirectly;

  // Storage functionality
  const { savedRundowns, loading, updateRundown, loadRundowns } = useRundownStorage();

  // Update the loadRundowns ref
  stableCallbacksRef.current.loadRundowns = loadRundowns;

  // Editing detection
  const { isEditing, markAsEditing } = useEditingState();

  // Pending updates for manual refresh
  const { hasPendingUpdates, markPendingUpdates, clearPendingUpdates } = usePendingUpdates();

  // Create a TRULY stable callback for remote updates using ref
  const onRemoteUpdateRef = useRef(() => {
    console.log('📡 Remote update detected, marking pending updates...');
    markPendingUpdates();
  });

  // Update the refs when functions change, but don't recreate the callbacks
  onRemoteUpdateRef.current = () => {
    console.log('📡 Remote update detected, marking pending updates...');
    markPendingUpdates();
  };

  // Use stable callbacks that never change
  const stableOnRemoteUpdate = useCallback(() => {
    onRemoteUpdateRef.current();
  }, []); // No dependencies!

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    console.log('🔄 Manual refresh triggered');
    clearPendingUpdates();
    if (stableCallbacksRef.current.loadRundowns) {
      stableCallbacksRef.current.loadRundowns();
    }
  }, [clearPendingUpdates]);

  // Set up realtime collaboration with truly stable callbacks
  const { isConnected } = useSimpleRealtimeCollaboration({
    rundownId,
    onRemoteUpdate: stableOnRemoteUpdate,
    enabled: !!rundownId
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

  // Update stable refs
  stableCallbacksRef.current.handleLoadLayout = handleLoadLayout;
  stableCallbacksRef.current.setItems = setItems;

  // Undo functionality with persistence
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo();

  const stableDataLoaderCallbacks = useMemo(() => ({
    setRundownTitle: stableCallbacksRef.current.setRundownTitleDirectly!,
    setTimezone: stableCallbacksRef.current.setTimezoneDirectly!,
    setRundownStartTime: stableCallbacksRef.current.setRundownStartTimeDirectly!,
    handleLoadLayout: stableCallbacksRef.current.handleLoadLayout!,
    setItems: stableCallbacksRef.current.setItems!,
    onRundownLoaded: (rundown: any) => {
      if (rundown.undo_history) {
        loadUndoHistory(rundown.undo_history);
      }
    }
  }), [loadUndoHistory]);

  useRundownDataLoader({
    rundownId,
    savedRundowns,
    loading,
    ...stableDataLoaderCallbacks
  });

  const { 
    isPlaying, 
    currentSegmentId, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(items, updateItem);

  const { calculateEndTime } = useTimeCalculations(items, updateItem, rundownStartTime);

  // Enhanced functions that trigger editing detection and save state
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    markAsEditing();
    updateItem(id, field, value);
  }, [updateItem, markAsEditing]);

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

    // Manual refresh functionality
    hasPendingUpdates,
    handleManualRefresh,

    // Realtime status
    isConnected,
    isEditing
  };
};
