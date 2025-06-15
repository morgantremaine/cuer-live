
import { useMemo, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useUnifiedColumnManager } from './useUnifiedColumnManager';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';

export const useStreamlinedRundownState = () => {
  // Core rundown state (items, title, timing, etc.)
  const coreState = useSimplifiedRundownState();
  
  // Unified column management
  const columnManager = useUnifiedColumnManager(coreState.rundownId);

  // Calculate end time helper
  const calculateEndTime = useCallback((startTime: string, duration: string) => {
    const startParts = startTime.split(':').map(Number);
    const durationParts = duration.split(':').map(Number);
    
    let totalSeconds = 0;
    if (startParts.length >= 2) {
      totalSeconds += startParts[0] * 3600 + startParts[1] * 60 + (startParts[2] || 0);
    }
    if (durationParts.length >= 2) {
      totalSeconds += durationParts[0] * 60 + durationParts[1];
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Add multiple rows helper
  const addMultipleRows = useCallback((newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    coreState.setItems(itemsToAdd);
  }, [coreState.setItems]);

  // Grid interactions
  const interactions = useRundownGridInteractions(
    coreState.items,
    (updater) => {
      if (typeof updater === 'function') {
        coreState.setItems(updater(coreState.items));
      } else {
        coreState.setItems(updater);
      }
    },
    coreState.updateItem,
    coreState.addRow,
    coreState.addHeader,
    coreState.deleteRow,
    coreState.toggleFloat,
    coreState.deleteMultipleItems,
    addMultipleRows,
    columnManager.deleteColumn,
    calculateEndTime,
    (id: string, color: string) => {
      coreState.updateItem(id, 'color', color);
    },
    () => {}, // markAsChanged handled internally
    coreState.setTitle,
    coreState.addRowAtIndex,
    coreState.addHeaderAtIndex
  );

  // UI state
  const uiState = useRundownUIState(
    coreState.items,
    columnManager.visibleColumns,
    coreState.updateItem,
    columnManager.setColumns,
    columnManager.columns
  );

  // Unified state object
  const unifiedState = useMemo(() => ({
    // Core data
    items: coreState.items,
    rundownTitle: coreState.rundownTitle,
    rundownStartTime: coreState.rundownStartTime,
    timezone: coreState.timezone,
    currentTime: coreState.currentTime,
    rundownId: coreState.rundownId,
    totalRuntime: coreState.totalRuntime,
    
    // Columns
    columns: columnManager.columns,
    visibleColumns: columnManager.visibleColumns,
    
    // State flags
    isLoading: coreState.isLoading || columnManager.isLoading,
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving || columnManager.isSaving,
    isConnected: coreState.isConnected,
    isProcessingRealtimeUpdate: coreState.isProcessingRealtimeUpdate,
    
    // Playback
    currentSegmentId: coreState.currentSegmentId,
    isPlaying: coreState.isPlaying,
    timeRemaining: coreState.timeRemaining,
    isController: coreState.isController,
    showcallerActivity: coreState.showcallerActivity,
    
    // Selection
    selectedRowId: coreState.selectedRowId,
    
    // Calculations
    getRowNumber: coreState.getRowNumber,
    getHeaderDuration: coreState.getHeaderDuration,
    
    // Core actions
    updateItem: coreState.updateItem,
    deleteRow: coreState.deleteRow,
    toggleFloat: coreState.toggleFloat,
    deleteMultipleItems: coreState.deleteMultipleItems,
    addItem: coreState.addItem,
    setTitle: coreState.setTitle,
    setStartTime: coreState.setStartTime,
    setTimezone: coreState.setTimezone,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    addRowAtIndex: coreState.addRowAtIndex,
    addHeaderAtIndex: coreState.addHeaderAtIndex,
    setItems: coreState.setItems,
    
    // Column actions
    setColumns: columnManager.setColumns,
    addColumn: columnManager.addColumn,
    updateColumnWidth: columnManager.updateColumnWidth,
    reorderColumns: columnManager.reorderColumns,
    deleteColumn: columnManager.deleteColumn,
    renameColumn: columnManager.renameColumn,
    toggleColumnVisibility: columnManager.toggleColumnVisibility,
    loadLayout: columnManager.loadLayout,
    
    // Selection actions
    handleRowSelection: coreState.handleRowSelection,
    clearRowSelection: coreState.clearRowSelection,
    
    // Playback controls
    play: coreState.play,
    pause: coreState.pause,
    forward: coreState.forward,
    backward: coreState.backward,
    
    // Undo
    undo: coreState.undo,
    canUndo: coreState.canUndo,
    lastAction: coreState.lastAction,
    
    // Helpers
    calculateEndTime
  }), [coreState, columnManager, calculateEndTime]);

  return {
    state: unifiedState,
    interactions,
    uiState
  };
};
