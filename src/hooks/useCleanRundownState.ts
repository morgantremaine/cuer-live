import { useMemo, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

// Clean, simplified state coordination without redundant layers
export const useCleanRundownState = () => {
  const { user } = useAuth();
  const userId = user?.id;

  // Core rundown state - the single source of truth
  const coreState = useSimplifiedRundownState();
  
  // Showcaller visual state - completely separate system
  const showcallerVisual = useShowcallerVisualState({
    items: coreState.items,
    rundownId: coreState.rundownId,
    userId: userId
  });

  // Realtime sync for showcaller only
  const showcallerSync = useShowcallerRealtimeSync({
    rundownId: coreState.rundownId,
    onExternalVisualStateReceived: showcallerVisual.applyExternalVisualState,
    enabled: !!coreState.rundownId
  });

  // Memoized helper functions
  const calculateEndTime = useMemo(() => (startTime: string, duration: string) => {
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

  const addMultipleRows = useCallback((newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    coreState.setItems(itemsToAdd);
  }, [coreState.setItems]);

  // Grid interactions (header collapse will be handled in OptimizedRundownTableWrapper)
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
    (columnId: string) => {
      const newColumns = coreState.columns.filter(col => col.id !== columnId);
      coreState.setColumns(newColumns);
    },
    calculateEndTime,
    (id: string, color: string) => {
      coreState.updateItem(id, 'color', color);
    },
    () => {}, // markAsChanged handled internally
    coreState.setTitle,
    coreState.addRowAtIndex || coreState.addRow,
    coreState.addHeaderAtIndex || coreState.addHeader
  );

  // UI state
  const uiState = useRundownUIState(
    coreState.items,
    coreState.visibleColumns,
    coreState.updateItem,
    coreState.setColumns,
    coreState.columns
  );

  // Return unified interface
  return {
    // Core data
    items: coreState.items,
    columns: coreState.columns,
    visibleColumns: coreState.visibleColumns,
    rundownTitle: coreState.rundownTitle,
    rundownStartTime: coreState.rundownStartTime,
    timezone: coreState.timezone,
    currentTime: coreState.currentTime,
    rundownId: coreState.rundownId,
    
    // State flags - properly separate content and showcaller processing
    isLoading: coreState.isLoading,
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving,
    isConnected: coreState.isConnected || showcallerSync.isConnected,
    isProcessingRealtimeUpdate: coreState.isProcessingRealtimeUpdate, // Only content updates
    isProcessingShowcallerUpdate: showcallerSync.isProcessingVisualUpdate, // Only showcaller updates
    
    // Showcaller state (visual only)
    currentSegmentId: showcallerVisual.currentSegmentId,
    isPlaying: showcallerVisual.isPlaying,
    timeRemaining: showcallerVisual.timeRemaining,
    isController: showcallerVisual.isController,
    getItemVisualStatus: showcallerVisual.getItemVisualStatus,
    
    // Selection
    selectedRowId: coreState.selectedRowId,
    handleRowSelection: coreState.handleRowSelection,
    clearRowSelection: coreState.clearRowSelection,
    
    // Calculations
    totalRuntime: coreState.totalRuntime,
    getRowNumber: coreState.getRowNumber,
    getHeaderDuration: coreState.getHeaderDuration,
    
    // Actions
    updateItem: coreState.updateItem,
    deleteRow: coreState.deleteRow,
    toggleFloatRow: coreState.toggleFloat,
    deleteMultipleItems: coreState.deleteMultipleItems,
    addItem: coreState.addItem,
    setTitle: coreState.setTitle,
    setStartTime: coreState.setStartTime,
    setTimezone: coreState.setTimezone,
    addRow: coreState.addRow,
    addHeader: coreState.addHeader,
    addRowAtIndex: coreState.addRowAtIndex || coreState.addRow,
    addHeaderAtIndex: coreState.addHeaderAtIndex || coreState.addHeader,
    
    // Column management
    addColumn: coreState.addColumn,
    updateColumnWidth: coreState.updateColumnWidth,
    setColumns: coreState.setColumns,
    
    // Showcaller controls
    play: showcallerVisual.play,
    pause: showcallerVisual.pause,
    forward: showcallerVisual.forward,
    backward: showcallerVisual.backward,
    reset: showcallerVisual.reset,
    jumpToSegment: showcallerVisual.jumpToSegment,
    
    // Undo
    undo: coreState.undo,
    canUndo: coreState.canUndo,
    lastAction: coreState.lastAction,
    
    // Helpers
    calculateEndTime,
    addMultipleRows,
    
    // Interactions and UI
    interactions,
    uiState
  };
};
