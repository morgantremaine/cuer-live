import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useEditingState } from './useEditingState';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { useEnhancedRealtimeCollaboration } from './useEnhancedRealtimeCollaboration';

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

  // Create a stable force reload function
  const onForceReloadRef = useRef(() => {
    console.log('🔄 Force reloading rundown data...');
    if (stableCallbacksRef.current.loadRundowns) {
      stableCallbacksRef.current.loadRundowns();
    }
  });

  const stableOnForceReload = useCallback(() => {
    onForceReloadRef.current();
  }, []);

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

  // Use enhanced realtime collaboration instead of the old one
  const { 
    isConnected, 
    trackPendingChange, 
    clearPendingChanges, 
    hasPendingChanges: hasRealtimePendingChanges 
  } = useEnhancedRealtimeCollaboration({
    rundownId,
    items,
    setItems,
    columns,
    handleLoadLayout,
    rundownTitle,
    setRundownTitleDirectly,
    timezone,
    setTimezoneDirectly,
    rundownStartTime,
    setRundownStartTimeDirectly,
    isEditing,
    onForceReload: stableOnForceReload,
    enabled: !!rundownId
  });

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

  // Enhanced functions that track pending changes for realtime
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    markAsEditing();
    trackPendingChange(id);
    updateItem(id, field, value);
  }, [updateItem, markAsEditing, trackPendingChange]);

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

  // Clear pending changes after successful save
  const wrappedMarkAsChanged = useCallback(() => {
    markAsChanged();
    // Clear realtime pending changes after a successful save
    setTimeout(() => {
      clearPendingChanges();
    }, 1000);
  }, [markAsChanged, clearPendingChanges]);

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
    markAsChanged: wrappedMarkAsChanged,

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

    // Enhanced realtime status
    isConnected,
    isEditing,
    hasPendingChanges: hasRealtimePendingChanges
  };
};
