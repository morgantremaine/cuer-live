import { usePersistedRundownState } from './usePersistedRundownState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { useDragAndDrop } from './useDragAndDrop';
import { RundownItem } from '@/types/rundown';
import { useState, useEffect, useMemo } from 'react';

export const useRundownStateCoordination = () => {
  // Stable connection state - once connected, stay connected
  const [stableIsConnected, setStableIsConnected] = useState(false);
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Single source of truth for all rundown state (with persistence)
  const persistedState = usePersistedRundownState();

  // PERFORMANCE-OPTIMIZED: Performance optimizations for large rundowns
  const performanceOptimization = useRundownPerformanceOptimization({
    items: persistedState.items,
    columns: persistedState.columns,
    startTime: persistedState.rundownStartTime
  });

  // Performance monitoring for rundowns larger than 50 items
  usePerformanceMonitoring({
    rundownId: persistedState.rundownId || 'unknown',
    itemCount: persistedState.items.length,
    enabled: persistedState.items.length > 50
  });

  // Simple auto-scroll state
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    return localStorage.getItem('autoScrollEnabled') === 'true';
  });

  const toggleAutoScroll = () => {
    const newValue = !autoScrollEnabled;
    setAutoScrollEnabled(newValue);
    localStorage.setItem('autoScrollEnabled', newValue.toString());
  };

  // Header collapse functionality (completely independent of main state)
  const { 
    toggleHeaderCollapse, 
    isHeaderCollapsed,
    getHeaderGroupItemIds
  } = useHeaderCollapse(persistedState.items);

  // Showcaller coordination (with isolated state) - NO interference with main state
  const showcallerCoordination = useShowcallerStateCoordination({
    rundownId: persistedState.rundownId,
    items: persistedState.items,
    userId
  });

  // Helper functions for adding rows with proper timing calculations
  const calculateEndTime = useMemo(() => {
    return (startTime: string, duration: string): string => {
      const parseTime = (time: string): number => {
        const [hours = 0, minutes = 0, seconds = 0] = time.split(':').map(Number);
        return hours * 3600 + minutes * 60 + seconds;
      };

      const formatTime = (totalSeconds: number): string => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      };

      const startSeconds = parseTime(startTime);
      const durationSeconds = parseTime(duration);
      return formatTime(startSeconds + durationSeconds);
    };
  }, []);

  // Update stable connection state only when rundown is truly ready
  useEffect(() => {
    if (persistedState.rundownId && !persistedState.isLoading && !stableIsConnected) {
      setStableIsConnected(true);
    }
  }, [persistedState.rundownId, persistedState.isLoading, stableIsConnected]);

  // Drag and drop system with header group integration
  const dragAndDropSystem = useDragAndDrop(
    performanceOptimization.calculatedItems,
    (reorderedItems) => {
      persistedState.setItems(reorderedItems);
      persistedState.markStructuralChange();
    },
    new Set<string>(), // selectedRows
    undefined, // scrollContainerRef
    persistedState.saveUndoState,
    persistedState.columns,
    persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    persistedState.markStructuralChange,
    persistedState.rundownId,
    userId
  );

  const visibleItems = performanceOptimization.calculatedItems;

  // CRITICAL PERFORMANCE OPTIMIZATION: Memoize return object
  return useMemo(() => ({
    coreState: {
      // Core data (performance optimized but same interface)  
      items: performanceOptimization.calculatedItems,
      columns: persistedState.columns,
      visibleColumns: performanceOptimization.visibleColumns,
      rundownTitle: persistedState.rundownTitle,
      rundownStartTime: persistedState.rundownStartTime,
      timezone: persistedState.timezone,
      showDate: persistedState.showDate,
      currentTime: persistedState.currentTime,
      rundownId: persistedState.rundownId,
      
      // State flags
      isLoading: persistedState.isLoading,
      hasUnsavedChanges: persistedState.hasUnsavedChanges,
      isSaving: persistedState.isSaving,
      isConnected: stableIsConnected,
      isProcessingRealtimeUpdate: persistedState.isProcessingRealtimeUpdate,
      
      // Showcaller visual state
      currentSegmentId: showcallerCoordination.currentSegmentId,
      isPlaying: showcallerCoordination.isPlaying,
      timeRemaining: showcallerCoordination.timeRemaining,
      isController: showcallerCoordination.isController,
      isInitialized: showcallerCoordination.isInitialized,
      hasLoadedInitialState: showcallerCoordination.hasLoadedInitialState,
      showcallerActivity: false,
      
      // Visual status overlay function
      getItemVisualStatus: showcallerCoordination.getItemVisualStatus,
      
      // Selection state
      selectedRowId: persistedState.selectedRowId,
      handleRowSelection: persistedState.handleRowSelection,
      clearRowSelection: persistedState.clearRowSelection,
      
      // Calculations (performance optimized)
      totalRuntime: performanceOptimization.totalRuntime,
      getRowNumber: performanceOptimization.getRowNumber,
      getHeaderDuration: performanceOptimization.getHeaderDuration,
      calculateHeaderDuration: performanceOptimization.calculateHeaderDuration,
      
      // Core actions
      updateItem: persistedState.updateItem,
      deleteRow: persistedState.deleteRow,
      toggleFloatRow: persistedState.toggleFloat,
      deleteMultipleItems: persistedState.deleteMultipleItems,
      addItem: persistedState.addItem,
      setTitle: persistedState.setTitle,
      setStartTime: persistedState.setStartTime,
      setTimezone: persistedState.setTimezone,
      setShowDate: persistedState.setShowDate,
      addRow: persistedState.addRow,
      addHeader: persistedState.addHeader,
      
      // Column management
      addColumn: persistedState.addColumn,
      updateColumnWidth: persistedState.updateColumnWidth,
      setColumns: persistedState.setColumns,
      
      // Showcaller visual controls
      play: showcallerCoordination.play,
      pause: showcallerCoordination.pause,
      forward: showcallerCoordination.forward,
      backward: showcallerCoordination.backward,
      reset: showcallerCoordination.reset,
      jumpToSegment: showcallerCoordination.jumpToSegment,
      
      // Undo functionality
      undo: persistedState.undo,
      canUndo: persistedState.canUndo,
      lastAction: persistedState.lastAction,
      
      // Auto scroll state and controls
      autoScrollEnabled,
      toggleAutoScroll,
      
      // Header collapse functions
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      
      // Autosave typing guard
      markActiveTyping: persistedState.markActiveTyping,
      
      // Helper functions needed by components
      calculateEndTime,
      markAsChanged: () => {},
      
      // Visible items
      visibleItems
    },
    dragAndDrop: dragAndDropSystem
  }), [
    // CRITICAL: Only include essential dependencies that affect rendering
    performanceOptimization.calculatedItems.length,
    persistedState.rundownId,
    persistedState.isLoading,
    stableIsConnected,
    showcallerCoordination.currentSegmentId,
    showcallerCoordination.isPlaying,
    persistedState.selectedRowId,
    autoScrollEnabled,
    visibleItems.length
  ]);
};