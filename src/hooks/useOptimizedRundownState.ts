
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';

// Optimized state coordination with memory management
export const useOptimizedRundownState = () => {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Single source of truth for rundown state
  const rundownState = useSimplifiedRundownState();
  
  // Showcaller visual state (separate from main state)
  const showcallerVisual = useShowcallerVisualState({
    items: rundownState.items,
    rundownId: rundownState.rundownId,
    userId: userId
  });

  // Memory optimization: Limit undo history to prevent memory bloat
  const limitedUndoHistory = useMemo(() => {
    const maxHistory = 20; // Limit to 20 undo actions
    if (rundownState.undoHistory && rundownState.undoHistory.length > maxHistory) {
      return rundownState.undoHistory.slice(-maxHistory);
    }
    return rundownState.undoHistory || [];
  }, [rundownState.undoHistory]);

  // Memory optimization: Debounced state updates to prevent excessive re-renders
  const debouncedUpdateRef = useRef<NodeJS.Timeout>();
  const debouncedUpdate = useCallback((updateFn: () => void) => {
    if (debouncedUpdateRef.current) {
      clearTimeout(debouncedUpdateRef.current);
    }
    debouncedUpdateRef.current = setTimeout(updateFn, 16); // ~60fps
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debouncedUpdateRef.current) {
        clearTimeout(debouncedUpdateRef.current);
      }
    };
  }, []);

  // Memoized calculations to prevent recalculation
  const memoizedCalculations = useMemo(() => ({
    totalRuntime: rundownState.totalRuntime,
    getRowNumber: rundownState.getRowNumber,
    getHeaderDuration: rundownState.getHeaderDuration,
    calculateHeaderDuration: (index: number) => {
      const item = rundownState.items[index];
      return item ? rundownState.getHeaderDuration(item.id) : '00:00:00';
    }
  }), [rundownState.totalRuntime, rundownState.getRowNumber, rundownState.getHeaderDuration, rundownState.items]);

  return {
    // Core state
    items: rundownState.items,
    columns: rundownState.columns,
    visibleColumns: rundownState.visibleColumns,
    rundownTitle: rundownState.rundownTitle,
    rundownStartTime: rundownState.rundownStartTime,
    timezone: rundownState.timezone,
    currentTime: rundownState.currentTime,
    rundownId: rundownState.rundownId,
    
    // State flags
    isLoading: rundownState.isLoading,
    hasUnsavedChanges: rundownState.hasUnsavedChanges,
    isSaving: rundownState.isSaving,
    isConnected: rundownState.isConnected,
    isProcessingRealtimeUpdate: rundownState.isProcessingRealtimeUpdate,
    
    // Showcaller state
    currentSegmentId: showcallerVisual.currentSegmentId,
    isPlaying: showcallerVisual.isPlaying,
    timeRemaining: showcallerVisual.timeRemaining,
    isController: showcallerVisual.isController,
    
    // Selection state
    selectedRowId: rundownState.selectedRowId,
    handleRowSelection: rundownState.handleRowSelection,
    clearRowSelection: rundownState.clearRowSelection,
    
    // Optimized calculations
    ...memoizedCalculations,
    
    // Core actions
    updateItem: rundownState.updateItem,
    deleteRow: rundownState.deleteRow,
    toggleFloatRow: rundownState.toggleFloat,
    addRow: rundownState.addRow,
    addHeader: rundownState.addHeader,
    setTitle: rundownState.setTitle,
    setStartTime: rundownState.setStartTime,
    
    // Showcaller controls
    play: showcallerVisual.play,
    pause: showcallerVisual.pause,
    forward: showcallerVisual.forward,
    backward: showcallerVisual.backward,
    reset: showcallerVisual.reset,
    jumpToSegment: showcallerVisual.jumpToSegment,
    
    // Optimized undo system
    undo: rundownState.undo,
    canUndo: limitedUndoHistory.length > 0,
    lastAction: rundownState.lastAction,
    
    // Memory management utilities
    debouncedUpdate,
    limitedUndoHistory
  };
};
