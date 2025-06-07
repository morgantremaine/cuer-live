
import { useRundownBasicState } from './useRundownBasicState';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { usePlaybackControls } from './usePlaybackControls';
import { useTimeCalculations } from './useTimeCalculations';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { useRundownUndo } from './useRundownUndo';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useEditingState } from './useEditingState';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';
import { SavedRundown } from './useRundownStorage/types';

export const useRundownGridCore = () => {
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);
  const [externalShowcallerState, setExternalShowcallerState] = useState<any>(null);
  
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

  // Rundown data integration with passing setApplyingRemoteUpdate
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
    isSaving,
    setApplyingRemoteUpdate,
    updateSavedSignature
  } = useRundownStateIntegration(
    markAsChanged, 
    rundownTitle, 
    timezone, 
    rundownStartTime,
    setRundownTitleDirectly, 
    setTimezoneDirectly,
    isProcessingRealtimeUpdate
  );

  // Update stable refs
  stableCallbacksRef.current.handleLoadLayout = handleLoadLayout;
  stableCallbacksRef.current.setItems = setItems;

  // Undo functionality with persistence
  const { saveState, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo();

  // Showcaller state change handler - fixed to only update showcaller_state
  const handleShowcallerStateChange = useCallback((showcallerState: any) => {
    if (!isProcessingRealtimeUpdate && rundownId) {
      console.log('📡 Broadcasting showcaller state change:', showcallerState);
      // Only update showcaller_state, not the entire rundown
      updateRundown(rundownId, {
        showcaller_state: showcallerState
      }).catch(error => {
        console.error('Failed to update showcaller state:', error);
      });
    }
  }, [rundownId, isProcessingRealtimeUpdate, updateRundown]);

  // Handle external rundown updates from realtime (updated to include showcaller state)
  const handleRundownUpdated = useCallback((updatedRundown: SavedRundown) => {
    console.log('🔄 Applying realtime rundown update');
    
    // Update showcaller state if changed
    if (updatedRundown.showcaller_state && 
        JSON.stringify(updatedRundown.showcaller_state) !== JSON.stringify(externalShowcallerState)) {
      console.log('🔄 Updating showcaller state from realtime');
      setExternalShowcallerState(updatedRundown.showcaller_state);
    }
    
    // Update title if changed
    if (updatedRundown.title !== rundownTitle) {
      stableCallbacksRef.current.setRundownTitleDirectly?.(updatedRundown.title);
    }
    
    // Update timezone if changed
    if (updatedRundown.timezone && updatedRundown.timezone !== timezone) {
      stableCallbacksRef.current.setTimezoneDirectly?.(updatedRundown.timezone);
    }
    
    // Update start time if changed
    if (updatedRundown.start_time && updatedRundown.start_time !== rundownStartTime) {
      stableCallbacksRef.current.setRundownStartTimeDirectly?.(updatedRundown.start_time);
    }
    
    // Update columns if changed
    if (updatedRundown.columns && JSON.stringify(updatedRundown.columns) !== JSON.stringify(columns)) {
      stableCallbacksRef.current.handleLoadLayout?.(updatedRundown.columns);
    }
    
    // Update items if changed
    if (updatedRundown.items && JSON.stringify(updatedRundown.items) !== JSON.stringify(items)) {
      console.log('🔄 Updating items from realtime');
      stableCallbacksRef.current.setItems?.(updatedRundown.items);
    }
    
    // Load undo history if present
    if (updatedRundown.undo_history) {
      loadUndoHistory(updatedRundown.undo_history);
    }
    
    // Refresh the rundowns list to ensure dashboard is updated
    stableCallbacksRef.current.loadRundowns?.();
  }, [rundownTitle, timezone, rundownStartTime, columns, items, loadUndoHistory, externalShowcallerState]);

  // Set up realtime collaboration with updateSavedSignature and setApplyingRemoteUpdate
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdated: handleRundownUpdated,
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isProcessingUpdate: isProcessingRealtimeUpdate,
    setIsProcessingUpdate: setIsProcessingRealtimeUpdate,
    updateSavedSignature,
    setApplyingRemoteUpdate
  });

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

  // Enhanced playback controls with real-time sync
  const { 
    isPlaying, 
    currentSegmentId, 
    timeRemaining, 
    play, 
    pause, 
    forward, 
    backward 
  } = usePlaybackControls(
    items, 
    updateItem, 
    handleShowcallerStateChange, 
    externalShowcallerState
  );

  const { calculateEndTime } = useTimeCalculations(items, updateItem, rundownStartTime);

  // Enhanced functions that trigger editing detection and save state
  const enhancedUpdateItem = useCallback((id: string, field: string, value: string) => {
    if (!isProcessingRealtimeUpdate) {
      markAsEditing();
      updateItem(id, field, value);
    }
  }, [updateItem, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedAddRow = useCallback((calculateEndTimeFn: any, selectedRowId?: string | null, selectedRows?: Set<string>) => {
    if (isProcessingRealtimeUpdate) return;
    
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
  }, [addRow, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedAddHeader = useCallback((selectedRowId?: string | null, selectedRows?: Set<string>) => {
    if (isProcessingRealtimeUpdate) return;
    
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
  }, [addHeader, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedDeleteRow = useCallback((id: string) => {
    if (isProcessingRealtimeUpdate) return;
    
    saveState(items, columns, rundownTitle, 'Delete Row');
    markAsEditing();
    deleteRow(id);
  }, [deleteRow, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    if (isProcessingRealtimeUpdate) return;
    
    saveState(items, columns, rundownTitle, 'Delete Multiple Rows');
    markAsEditing();
    deleteMultipleRows(ids);
  }, [deleteMultipleRows, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    if (isProcessingRealtimeUpdate) return;
    
    saveState(items, columns, rundownTitle, 'Toggle Float');
    markAsEditing();
    toggleFloatRow(id);
  }, [toggleFloatRow, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedSetItems = useCallback((updater: (prev: RundownItem[]) => RundownItem[]) => {
    if (isProcessingRealtimeUpdate) return;
    
    const newItems = typeof updater === 'function' ? updater(items) : updater;
    if (JSON.stringify(newItems) !== JSON.stringify(items)) {
      saveState(items, columns, rundownTitle, 'Move Rows');
      markAsEditing();
    }
    setItems(updater);
  }, [setItems, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedAddMultipleRows = useCallback((newItems: RundownItem[], calculateEndTimeFn: any) => {
    if (isProcessingRealtimeUpdate) return;
    
    saveState(items, columns, rundownTitle, 'Paste Rows');
    markAsEditing();
    addMultipleRows(newItems);
  }, [addMultipleRows, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const wrappedSetRundownTitle = useCallback((title: string) => {
    if (isProcessingRealtimeUpdate) return;
    
    if (title !== rundownTitle) {
      saveState(items, columns, rundownTitle, 'Change Title');
      markAsEditing();
    }
    setRundownTitle(title);
  }, [setRundownTitle, saveState, items, columns, rundownTitle, markAsEditing, isProcessingRealtimeUpdate]);

  const handleUndo = useCallback(() => {
    if (isProcessingRealtimeUpdate) return;
    
    const action = undo(setItems, handleLoadLayout, setRundownTitleDirectly);
    if (action) {
      markAsChanged();
      markAsEditing();
      console.log(`Undid: ${action}`);
    }
  }, [undo, setItems, handleLoadLayout, setRundownTitleDirectly, markAsChanged, markAsEditing, isProcessingRealtimeUpdate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo && !isProcessingRealtimeUpdate) {
          handleUndo();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, canUndo, isProcessingRealtimeUpdate]);

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
    currentSegmentId: externalShowcallerState?.currentSegmentId ?? currentSegmentId,
    timeRemaining: externalShowcallerState?.timeRemaining ?? timeRemaining,
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
    hasUnsavedChanges: hasUnsavedChanges && !isProcessingRealtimeUpdate,
    isSaving,
    calculateEndTime,

    // Undo functionality
    handleUndo,
    canUndo,
    lastAction,

    // Realtime status
    isConnected,
    isEditing,
    isProcessingRealtimeUpdate
  };
};
