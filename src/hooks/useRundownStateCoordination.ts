
import { useState, useCallback, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useRundownGridCore } from './useRundownGridCore';
import { useRundownInteractionHandlers } from './useRundownInteractionHandlers';
import { useRundownUIState } from './useRundownUIState';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useStableRealtimeCollaboration } from './useStableRealtimeCollaboration';
import { calculateEndTime } from '@/utils/rundownCalculations';

export const useRundownStateCoordination = () => {
  const { id } = useParams<{ id: string }>();
  const rundownId = id === 'new' ? null : id || null;
  
  // Basic state
  const [rundownTitle, setRundownTitle] = useState('Untitled Rundown');
  const [timezone, setTimezone] = useState('America/Los_Angeles');
  const [rundownStartTime, setRundownStartTime] = useState('09:00:00');
  const [autoSaveTrigger, setAutoSaveTrigger] = useState<(() => void) | null>(null);
  const [isProcessingRealtimeUpdate, setIsProcessingRealtimeUpdate] = useState(false);

  // Storage and data loading
  const { savedRundowns, loading: storageLoading, loadRundowns } = useRundownStorage();

  // Create stable callback refs to prevent infinite loops
  const setRundownTitleDirectly = useCallback((title: string) => {
    setRundownTitle(title);
  }, []);

  const setTimezoneDirectly = useCallback((tz: string) => {
    setTimezone(tz);
  }, []);

  const setRundownStartTimeDirectly = useCallback((startTime: string) => {
    setRundownStartTime(startTime);
  }, []);

  const markAsChanged = useCallback(() => {
    console.log('🚀 Mark as changed called in coordination');
    // This will trigger auto-save through the core system
  }, []);

  // Core grid functionality with auto-save
  const core = useRundownGridCore({
    markAsChanged,
    rundownTitle,
    timezone,
    rundownStartTime,
    setRundownTitleDirectly,
    setTimezoneDirectly,
    setRundownStartTimeDirectly,
    setAutoSaveTrigger,
    isProcessingRealtimeUpdate
  });

  // ENABLE REALTIME: Set up realtime collaboration for rundown content
  const { trackOwnUpdate, setEditingState } = useRealtimeRundown({
    rundownId,
    onRundownUpdated: (updatedRundown) => {
      console.log('📡 Applying realtime rundown update');
      setIsProcessingRealtimeUpdate(true);
      
      try {
        // Update the core state with the new data
        if (updatedRundown.items && Array.isArray(updatedRundown.items)) {
          core.setItems(() => updatedRundown.items);
        }
        if (updatedRundown.title) {
          setRundownTitleDirectly(updatedRundown.title);
        }
        if (updatedRundown.timezone) {
          setTimezoneDirectly(updatedRundown.timezone);
        }
        if (updatedRundown.start_time) {
          setRundownStartTimeDirectly(updatedRundown.start_time);
        }
        if (updatedRundown.columns && Array.isArray(updatedRundown.columns)) {
          core.handleLoadLayout(updatedRundown.columns);
        }
      } finally {
        setTimeout(() => {
          setIsProcessingRealtimeUpdate(false);
        }, 500);
      }
    },
    hasUnsavedChanges: core.hasUnsavedChanges,
    isProcessingUpdate: isProcessingRealtimeUpdate,
    setIsProcessingUpdate: setIsProcessingRealtimeUpdate,
    updateSavedSignature: core.updateSavedSignature,
    setApplyingRemoteUpdate: core.setApplyingRemoteUpdate
  });

  // General collaboration for list updates
  const { isConnected: isCollaborationConnected } = useStableRealtimeCollaboration({
    rundownId,
    onRemoteUpdate: loadRundowns,
    onReloadCurrentRundown: () => {
      // Reload the current rundown data to show changes
      loadRundowns();
    },
    enabled: true
  });

  // Interaction handlers (selection, drag/drop, clipboard) with proper calculateEndTime
  const interactions = useRundownInteractionHandlers(
    core.items,
    core.setItems,
    core.updateItem,
    () => core.addRow(calculateEndTime), // Fix: Pass calculateEndTime function
    () => core.addHeader(), // Fix: Remove parameters
    core.deleteRow,
    core.toggleFloatRow,
    core.deleteMultipleRows,
    core.addMultipleRows,
    core.handleDeleteColumn,
    calculateEndTime, // Add calculateEndTime
    (id: string, color: string) => {
      // Implement selectColor - this was missing
      core.updateItem(id, 'color', color);
    },
    core.markAsChanged,
    core.setRundownTitle
  );

  // UI state management
  const uiState = useRundownUIState(
    core.items,
    core.visibleColumns,
    core.updateItem,
    core.markAsChanged,
    rundownStartTime,
    core.isPlaying,
    core.currentSegmentId
  );

  // Enhanced wrapper functions that track changes for realtime
  const wrappedUpdateItem = useCallback((id: string, field: string, value: string) => {
    setEditingState(true);
    core.updateItem(id, field, value);
    
    // Track our own update for realtime coordination
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    
    setTimeout(() => setEditingState(false), 1000);
  }, [core.updateItem, trackOwnUpdate, setEditingState]);

  const wrappedAddRow = useCallback(() => {
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    return core.addRow(calculateEndTime);
  }, [core.addRow, trackOwnUpdate]);

  const wrappedAddHeader = useCallback(() => {
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    return core.addHeader();
  }, [core.addHeader, trackOwnUpdate]);

  const wrappedDeleteRow = useCallback((id: string) => {
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    return core.deleteRow(id);
  }, [core.deleteRow, trackOwnUpdate]);

  const wrappedToggleFloatRow = useCallback((id: string) => {
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    return core.toggleFloatRow(id);
  }, [core.toggleFloatRow, trackOwnUpdate]);

  const wrappedSetRundownTitle = useCallback((title: string) => {
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    return core.setRundownTitle(title);
  }, [core.setRundownTitle, trackOwnUpdate]);

  const wrappedSetRundownStartTime = useCallback((startTime: string) => {
    setEditingState(true);
    setRundownStartTimeDirectly(startTime);
    markAsChanged();
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    
    setTimeout(() => setEditingState(false), 500);
  }, [setRundownStartTimeDirectly, markAsChanged, trackOwnUpdate, setEditingState]);

  const wrappedSetTimezone = useCallback((tz: string) => {
    setEditingState(true);
    setTimezoneDirectly(tz);
    markAsChanged();
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    
    setTimeout(() => setEditingState(false), 500);
  }, [setTimezoneDirectly, markAsChanged, trackOwnUpdate, setEditingState]);

  // Memoized state objects
  const coreState = useMemo(() => ({
    // Time and basic info
    currentTime: new Date(), // Fix: Return Date object, not string
    timezone,
    rundownTitle,
    setRundownTitle: wrappedSetRundownTitle,
    rundownStartTime,
    setRundownStartTime: wrappedSetRundownStartTime,
    setTimezone: wrappedSetTimezone,
    rundownId,

    // Data
    items: core.items,
    visibleColumns: core.visibleColumns,
    columns: core.columns,

    // Calculations
    getRowNumber: core.getRowNumber,
    calculateHeaderDuration: core.calculateHeaderDuration,
    calculateTotalRuntime: core.calculateTotalRuntime,
    calculateEndTime: calculateEndTime, // Add missing calculateEndTime

    // Operations - use wrapped versions for realtime tracking
    updateItem: wrappedUpdateItem,
    deleteRow: wrappedDeleteRow,
    toggleFloatRow: wrappedToggleFloatRow,
    addRow: wrappedAddRow,
    addHeader: wrappedAddHeader,

    // Selection - add missing properties
    selectedRowId: interactions.selectedRows.size === 1 ? Array.from(interactions.selectedRows)[0] : null,
    handleRowSelection: interactions.handleRowSelection,
    clearRowSelection: interactions.clearSelection,

    // Showcaller
    currentSegmentId: core.currentSegmentId,
    isPlaying: core.isPlaying,
    timeRemaining: core.timeRemaining,
    play: core.play,
    pause: core.pause,
    forward: core.forward,
    backward: core.backward,

    // Column management
    handleAddColumn: core.handleAddColumn,
    handleReorderColumns: core.handleReorderColumns,
    handleDeleteColumn: core.handleDeleteColumn,
    handleRenameColumn: core.handleRenameColumn,
    handleToggleColumnVisibility: core.handleToggleColumnVisibility,
    handleLoadLayout: core.handleLoadLayout,

    // UI State
    showColumnManager: false, // Add missing property
    setShowColumnManager: () => {}, // Add missing property

    // State tracking
    hasUnsavedChanges: core.hasUnsavedChanges,
    isSaving: core.isSaving,
    markAsChanged: core.markAsChanged,

    // Undo
    handleUndo: core.handleUndo,
    canUndo: core.canUndo,
    lastAction: core.lastAction,

    // Realtime status
    isConnected: isCollaborationConnected,
    isProcessingRealtimeUpdate
  }), [
    timezone, rundownTitle, rundownStartTime, rundownId, core, 
    wrappedUpdateItem, wrappedDeleteRow, wrappedToggleFloatRow, 
    wrappedAddRow, wrappedAddHeader, wrappedSetRundownTitle,
    wrappedSetRundownStartTime, wrappedSetTimezone,
    isCollaborationConnected, isProcessingRealtimeUpdate, interactions
  ]);

  // Enhanced UI state with missing properties
  const enhancedUiState = useMemo(() => ({
    ...uiState,
    // Add missing properties
    getColumnWidth: (column: any) => column.width || '150px',
    updateColumnWidth: (columnId: string, width: number) => {
      console.log('Update column width:', columnId, width);
    },
    handleCellClick: (itemId: string, field: string) => {
      console.log('Cell click:', itemId, field);
    },
    handleKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => {
      console.log('Key down:', e.key, itemId, field);
    },
    cellRefs: { current: {} }
  }), [uiState]);

  return {
    coreState,
    interactions,
    uiState: enhancedUiState
  };
};
