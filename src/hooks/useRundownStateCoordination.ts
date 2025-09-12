import { usePersistedRundownState } from './usePersistedRundownState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { useDragAndDrop } from './useDragAndDrop';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';

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
  } = useHeaderCollapse();

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

  // Add multiple rows with calculated timing
  const addMultipleRows = (count: number, insertAfterIndex: number = -1) => {
    const newItems = [];
    const lastItem = insertAfterIndex >= 0 ? persistedState.items[insertAfterIndex] : null;
    let currentStartTime = lastItem?.endTime || persistedState.rundownStartTime;
    
    for (let i = 0; i < count; i++) {
      const newItem = {
        id: `${Date.now()}-${i}`,
        name: `New Item ${i + 1}`,
        script: '',
        duration: '00:00:30',
        startTime: currentStartTime,
        endTime: calculateEndTime(currentStartTime, '00:00:30'),
        type: 'segment' as const,
        notes: '',
        color: '#ffffff',
        float: false,
        external_notes: {}
      };
      
      newItems.push(newItem);
      currentStartTime = newItem.endTime;
    }
    
    const updatedItems = [...persistedState.items];
    const insertIndex = insertAfterIndex >= 0 ? insertAfterIndex + 1 : updatedItems.length;
    updatedItems.splice(insertIndex, 0, ...newItems);
    
    persistedState.setItems(updatedItems);
    // Clear structural change flag after items are set
    setTimeout(() => persistedState.clearStructuralChange(), 50);
  };

  const addRowAtIndex = (index: number) => {
    addMultipleRows(1, index - 1);
  };

  const addHeaderAtIndex = (index: number) => {
    const lastItem = index > 0 ? persistedState.items[index - 1] : null;
    const currentStartTime = lastItem?.endTime || persistedState.rundownStartTime;
    
    const newHeader = {
      id: `${Date.now()}-header`,
      name: 'New Header',
      script: '',
      duration: '00:00:00',
      startTime: currentStartTime,
      endTime: currentStartTime,
      type: 'header' as const,
      notes: '',
      color: '#E3F2FD',
      float: false,
      external_notes: {}
    };
    
    const updatedItems = [...persistedState.items];
    updatedItems.splice(index, 0, newHeader);
    persistedState.setItems(updatedItems);
    // Clear structural change flag after items are set
    setTimeout(() => persistedState.clearStructuralChange(), 50);
  };

  // Grid interactions with proper drag and drop integration
  const interactions = useRundownGridInteractions({
    items: performanceOptimization.calculatedItems,
    visibleColumns: performanceOptimization.visibleColumns,
    updateItem: persistedState.updateItem,
    deleteRow: persistedState.deleteRow,
    addItem: persistedState.addItem,
    toggleFloat: persistedState.toggleFloat,
    setTitle: persistedState.setTitle,
    setStartTime: persistedState.setStartTime,
    setTimezone: persistedState.setTimezone,
    setShowDate: persistedState.setShowDate,
    setItems: (items) => {
      persistedState.setItems(items);
      // Clear structural change flag after items are set
      setTimeout(() => persistedState.clearStructuralChange(), 50);
    },
    selectedRows: new Set<string>(), // selectedRows - placeholder for now
    scrollContainerRef: undefined, // scrollContainerRef - placeholder for now
    saveUndoState: persistedState.saveUndoState,
    columns: persistedState.columns,
    rundownTitle: persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    markStructuralChange: persistedState.markStructuralChange,
    rundownId: persistedState.rundownId, // Pass rundownId for broadcasts
    userId // Pass userId for broadcasts
  });
  
  // Update stable connection state only when rundown is truly ready
  useEffect(() => {
    if (persistedState.rundownId && !persistedState.isLoading && !stableIsConnected) {
      setStableIsConnected(true);
    }
  }, [persistedState.rundownId, persistedState.isLoading, stableIsConnected]);

  // Simplified processing state - no teleprompter interference
  const isProcessingRealtimeUpdate = persistedState.isProcessingRealtimeUpdate;

  // UI state management with performance optimizations
  const uiState = useRundownUIState({
    items: performanceOptimization.calculatedItems,
    visibleColumns: performanceOptimization.visibleColumns,
    currentSegmentId: showcallerCoordination.currentSegmentId,
    selectedRowId: persistedState.selectedRowId
  });

  // Drag and drop system with header group integration
  const dragAndDropSystem = useDragAndDrop({
    items: performanceOptimization.calculatedItems,
    onReorderItems: (reorderedItems) => {
      persistedState.setItems(reorderedItems);
      // Clear structural change flag after items are set
      setTimeout(() => persistedState.clearStructuralChange(), 50);
      persistedState.markStructuralChange();
    },
    onStructuralChange: persistedState.markStructuralChange,
    // Pass header collapse functions directly
    isHeaderCollapsed,
    getHeaderGroupItemIds
  });

  const visibleItems = dragAndDropSystem.visibleItems || performanceOptimization.calculatedItems;

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
      
      // State flags (NOW with separated processing states)
      isLoading: persistedState.isLoading,
      hasUnsavedChanges: persistedState.hasUnsavedChanges,
      isSaving: persistedState.isSaving,
      // Use stable connection state to prevent flickering
      isConnected: stableIsConnected,
      isProcessingRealtimeUpdate, // Clean, simple content processing indicator
      
      // Showcaller visual state from completely separate system
      currentSegmentId: showcallerCoordination.currentSegmentId,
      isPlaying: showcallerCoordination.isPlaying,
      timeRemaining: showcallerCoordination.timeRemaining,
      isController: showcallerCoordination.isController,
      isInitialized: showcallerCoordination.isInitialized,
      hasLoadedInitialState: showcallerCoordination.hasLoadedInitialState,
      showcallerActivity: false,
      
      // Visual status overlay function (doesn't touch main state)
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
      
      // Core actions (NO showcaller interference)
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
      addRowAtIndex,
      addHeaderAtIndex,
      
      // Column management
      addColumn: persistedState.addColumn,
      updateColumnWidth: persistedState.updateColumnWidth,
      setColumns: persistedState.setColumns,
      
      // Showcaller visual controls (completely separate from main state)
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
      
      // Header collapse functions using the separate hook
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      
      // Autosave typing guard
      markActiveTyping: persistedState.markActiveTyping
    },
    interactions,
    uiState,
    dragAndDrop: dragAndDropSystem,
    visibleItems
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
      
      // State flags (NOW with separated processing states)
      isLoading: persistedState.isLoading,
      hasUnsavedChanges: persistedState.hasUnsavedChanges,
      isSaving: persistedState.isSaving,
      // Use stable connection state to prevent flickering
      isConnected: stableIsConnected,
      isProcessingRealtimeUpdate, // Clean, simple content processing indicator
      
      // Showcaller visual state from completely separate system
      currentSegmentId: showcallerCoordination.currentSegmentId,
      isPlaying: showcallerCoordination.isPlaying,
      timeRemaining: showcallerCoordination.timeRemaining,
      isController: showcallerCoordination.isController,
      isInitialized: showcallerCoordination.isInitialized,
      hasLoadedInitialState: showcallerCoordination.hasLoadedInitialState, // Add this for visual indicator loading
      showcallerActivity: false, // No longer interferes with main state
      
      // Visual status overlay function (doesn't touch main state)
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
      
      // Core actions (NO showcaller interference)
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
      addRowAtIndex,
      addHeaderAtIndex,
      
      // Column management
      addColumn: persistedState.addColumn,
      updateColumnWidth: persistedState.updateColumnWidth,
      setColumns: persistedState.setColumns,
      
      // Showcaller visual controls (completely separate from main state)
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
      
      // Header collapse functions using the separate hook
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      
      // Autosave typing guard
      markActiveTyping: persistedState.markActiveTyping
    },
    interactions,
    uiState,
    dragAndDrop: dragAndDropSystem,
    visibleItems
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