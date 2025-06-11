
import { useCallback } from 'react';
import { useRundownStateIntegration } from './useRundownStateIntegration';
import { useRundownDataLoader } from './useRundownDataLoader';
import { useRundownStorage } from './useRundownStorage';
import { usePlaybackControls } from './usePlaybackControls';
import { useRundownUndo } from './useRundownUndo';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';

interface UseRundownGridCoreProps {
  markAsChanged: () => void;
  rundownTitle: string;
  timezone: string;
  rundownStartTime: string;
  setRundownTitleDirectly: (title: string) => void;
  setTimezoneDirectly: (timezone: string) => void;
  setRundownStartTimeDirectly: (startTime: string) => void;
  setAutoSaveTrigger: (trigger: () => void) => void;
  isProcessingRealtimeUpdate?: boolean;
}

export const useRundownGridCore = ({
  markAsChanged,
  rundownTitle,
  timezone,
  rundownStartTime,
  setRundownTitleDirectly,
  setTimezoneDirectly,
  setRundownStartTimeDirectly,
  setAutoSaveTrigger,
  isProcessingRealtimeUpdate
}: UseRundownGridCoreProps) => {
  // State integration with all the core functionality
  const state = useRundownStateIntegration(
    markAsChanged,
    rundownTitle,
    timezone,
    rundownStartTime,
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    setAutoSaveTrigger,
    isProcessingRealtimeUpdate
  );

  // Storage management
  const { savedRundowns, loading: storageLoading, loadRundowns } = useRundownStorage();

  // Data loading
  useRundownDataLoader({
    savedRundowns,
    loading: storageLoading,
    setRundownTitle: setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    handleLoadLayout: state.handleLoadLayout,
    setItems: state.setItems
  });

  // Undo functionality with auto-save coordination
  const { saveStateOnSave, undo, canUndo, lastAction, loadUndoHistory } = useRundownUndo({
    rundownId: getCurrentRundownId(),
    currentTitle: rundownTitle,
    currentItems: state.items,
    currentColumns: state.columns
  });

  // Enhanced undo state saving - only save on actual user actions, not automatic time updates
  const saveUndoState = useCallback((action: string) => {
    if (!isProcessingRealtimeUpdate) {
      // Add a small delay to ensure state has fully updated
      setTimeout(() => {
        saveStateOnSave(state.items, state.columns, rundownTitle, action);
      }, 150);
    }
  }, [saveStateOnSave, state.items, state.columns, rundownTitle, isProcessingRealtimeUpdate]);

  // Wrap state operations to save undo states - with better action grouping
  const wrappedUpdateItem = useCallback((id: string, field: string, value: string) => {
    state.updateItem(id, field, value);
    // Only save undo state for significant manual changes, not automatic time updates
    if (field !== 'name' && field !== 'script' && field !== 'startTime' && field !== 'endTime' && field !== 'elapsedTime') {
      saveUndoState(`Update ${field}`);
    }
  }, [state.updateItem, saveUndoState]);

  const wrappedAddRow = useCallback((calculateEndTime: any, selectedRowId?: string) => {
    // Save undo state BEFORE the action to capture the current state
    saveUndoState('Add segment');
    state.addRow(calculateEndTime, selectedRowId);
  }, [state.addRow, saveUndoState]);

  const wrappedAddHeader = useCallback((selectedRowId?: string) => {
    // Save undo state BEFORE the action to capture the current state
    saveUndoState('Add header');
    state.addHeader(selectedRowId);
  }, [state.addHeader, saveUndoState]);

  const wrappedDeleteRow = useCallback((id: string) => {
    saveUndoState('Delete row');
    state.deleteRow(id);
  }, [state.deleteRow, saveUndoState]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    saveUndoState('Toggle float');
    state.toggleFloatRow(id);
  }, [state.toggleFloatRow, saveUndoState]);

  const wrappedDeleteMultipleRows = useCallback((ids: string[]) => {
    saveUndoState('Delete multiple rows');
    state.deleteMultipleRows(ids);
  }, [state.deleteMultipleRows, saveUndoState]);

  const wrappedAddMultipleRows = useCallback((items: any[], calculateEndTime: any) => {
    saveUndoState('Add multiple rows');
    state.addMultipleRows(items);
  }, [state.addMultipleRows, saveUndoState]);

  const wrappedHandleDeleteColumn = useCallback((columnId: string) => {
    saveUndoState('Delete column');
    state.handleDeleteColumn(columnId);
  }, [state.handleDeleteColumn, saveUndoState]);

  // Enhanced undo handler
  const handleUndo = useCallback(() => {
    console.log('handleUndo called, canUndo:', canUndo);
    if (!canUndo) {
      console.log('Cannot undo - no states available');
      return null;
    }

    const result = undo(
      state.setItems,
      (layoutData: any) => {
        if (Array.isArray(layoutData)) {
          state.handleLoadLayout(layoutData);
        } else if (layoutData && typeof layoutData === 'object') {
          if ('columns' in layoutData && Array.isArray(layoutData.columns)) {
            state.handleLoadLayout(layoutData.columns);
          } else {
            console.warn('Invalid layout data for undo - no columns array found:', layoutData);
          }
        } else {
          console.warn('Invalid layout data for undo:', layoutData);
        }
      },
      setRundownTitleDirectly
    );

    return result;
  }, [undo, canUndo, state.setItems, state.handleLoadLayout, setRundownTitleDirectly]);

  // Enhanced setRundownTitle that also triggers change tracking and undo state
  const setRundownTitle = useCallback((newTitle: string) => {
    if (rundownTitle !== newTitle) {
      saveUndoState('Change title');
      setRundownTitleDirectly(newTitle);
      markAsChanged();
    }
  }, [setRundownTitleDirectly, markAsChanged, rundownTitle, saveUndoState]);

  // Showcaller/playback controls
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController
  } = usePlaybackControls(
    state.items,
    wrappedUpdateItem
  );

  // Extract rundownId from the URL if available
  function getCurrentRundownId() {
    const pathParts = window.location.pathname.split('/');
    const rundownIndex = pathParts.indexOf('rundown');
    if (rundownIndex !== -1 && pathParts[rundownIndex + 1]) {
      const id = pathParts[rundownIndex + 1];
      return (id === 'new' || id === ':id') ? null : id;
    }
    return null;
  }

  // Realtime collaboration
  const { isConnected } = useStableRealtimeCollaboration({
    rundownId: getCurrentRundownId(),
    onRemoteUpdate: loadRundowns,
    enabled: true
  });

  return {
    // Use wrapped functions that save undo states
    ...state,
    updateItem: wrappedUpdateItem,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,
    deleteRow: wrappedDeleteRow,
    toggleFloatRow: wrappedToggleFloatRow,
    deleteMultipleRows: wrappedDeleteMultipleRows,
    addMultipleRows: wrappedAddMultipleRows,
    handleDeleteColumn: wrappedHandleDeleteColumn,
    savedRundowns,
    loading: storageLoading,
    isProcessingRealtimeUpdate: isProcessingRealtimeUpdate || false,
    isConnected: isConnected || false,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController,
    setRundownTitle,
    currentTime: new Date(),
    handleUndo,
    canUndo,
    lastAction,
    loadUndoHistory
  };
};
