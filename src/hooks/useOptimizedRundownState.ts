
import { useCallback, useMemo, useRef, useEffect } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useAuth } from './useAuth';
import { logger } from '@/utils/logger';
import { RundownItem } from '@/types/rundown';

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

  // Helper function to calculate end time
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

  // Mark as changed function (no-op since auto-save handles this)
  const markAsChanged = useCallback(() => {
    // Auto-save system handles change tracking
    logger.log('Change marked - handled by auto-save system');
  }, []);

  // Set timezone function
  const setTimezone = useCallback((timezone: string) => {
    if (rundownState.setTimezone) {
      rundownState.setTimezone(timezone);
    } else {
      logger.warn('setTimezone not available in rundown state');
    }
  }, [rundownState.setTimezone]);

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
    setTimezone: setTimezone, // Now properly implemented
    setItems: rundownState.setItems,
    setColumns: rundownState.setColumns,
    
    // Additional methods needed by other components
    calculateEndTime, // Now properly implemented
    markAsChanged, // Now properly implemented
    addItem: (item: RundownItem) => {
      const newItems = [...rundownState.items, item];
      rundownState.setItems(newItems);
    },
    
    // Showcaller controls
    play: showcallerVisual.play,
    pause: showcallerVisual.pause,
    forward: showcallerVisual.forward,
    backward: showcallerVisual.backward,
    reset: showcallerVisual.reset,
    jumpToSegment: showcallerVisual.jumpToSegment,
    
    // Optimized undo system
    undo: rundownState.undo,
    canUndo: rundownState.canUndo,
    lastAction: rundownState.lastAction,
    
    // Memory management utilities
    debouncedUpdate
  };
};
