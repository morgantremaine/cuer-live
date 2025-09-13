import { useUnifiedRundownState } from './useUnifiedRundownState';
import { useUnifiedShowcallerSync } from './useUnifiedShowcallerSync';
import { useRundownInteractions } from './useRundownInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { useDragAndDrop } from './useDragAndDrop';
import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // UNIFIED: Single source of truth for all rundown state
  const unifiedState = useUnifiedRundownState();

  // UNIFIED: Single showcaller sync system
  const showcallerSync = useUnifiedShowcallerSync({
    items: unifiedState.items,
    rundownId: unifiedState.rundownId,
    userId
  });

  // Performance optimization layer for large rundowns
  const performanceOptimization = useRundownPerformanceOptimization({
    items: unifiedState.items,
    columns: unifiedState.columns,
    startTime: unifiedState.startTime
  });

  // Autoscroll state with localStorage persistence
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('rundown-autoscroll-enabled');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Persist autoscroll preference
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('rundown-autoscroll-enabled', JSON.stringify(autoScrollEnabled));
    }
  }, [autoScrollEnabled]);

  const toggleAutoScroll = () => {
    setAutoScrollEnabled(prev => !prev);
  };

  // Calculate end time helper
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

  // Add multiple rows function
  const addMultipleRows = (newItems: any[]) => {
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calculateEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    unifiedState.setItems([...unifiedState.items, ...itemsToAdd]);
  };

  // Get header collapse functions
  const { getHeaderGroupItemIds, isHeaderCollapsed, toggleHeaderCollapse, visibleItems } = useHeaderCollapse(performanceOptimization.calculatedItems);

  // Interactions layer for row selection, drag & drop, copy/paste
  const interactions = useRundownInteractions({
    items: unifiedState.items,
    updateItem: unifiedState.updateItem,
    deleteRow: unifiedState.deleteRow,
    addRow: unifiedState.addRow,
    addHeader: unifiedState.addHeader,
    deleteMultipleItems: unifiedState.deleteMultipleItems
  });

  // UI state layer for color picker, cell interactions, etc.
  const uiState = useRundownUIState(
    performanceOptimization.calculatedItems,
    unifiedState.columns,
    unifiedState.updateItem,
    unifiedState.setColumns,
    unifiedState.columns
  );

  return {
    coreState: {
      // Core data (from unified state)
      items: performanceOptimization.calculatedItems,
      columns: unifiedState.columns,
      visibleColumns: performanceOptimization.visibleColumns,
      rundownTitle: unifiedState.title,
      rundownStartTime: unifiedState.startTime,
      timezone: unifiedState.timezone,
      showDate: unifiedState.showDate,
      currentTime: unifiedState.currentTime,
      rundownId: unifiedState.rundownId,
      
      // State flags
      isLoading: unifiedState.isLoading,
      hasUnsavedChanges: unifiedState.hasUnsavedChanges,
      isSaving: unifiedState.isSaving,
      isConnected: unifiedState.isConnected,
      isProcessingRealtimeUpdate: false,
      
      // Showcaller state (from unified showcaller)
      currentSegmentId: showcallerSync.currentSegmentId,
      isPlaying: showcallerSync.isPlaying,
      timeRemaining: showcallerSync.timeRemaining,
      isController: showcallerSync.isController,
      isInitialized: showcallerSync.isInitialized,
      hasLoadedInitialState: showcallerSync.hasLoadedInitialState,
      
      // Visual status function
      getItemVisualStatus: showcallerSync.getItemVisualStatus,
      
      // Selection state
      selectedRowId: unifiedState.selectedRowId,
      handleRowSelection: unifiedState.handleRowSelection,
      clearRowSelection: unifiedState.clearRowSelection,
      
      // Performance optimized calculations
      totalRuntime: performanceOptimization.totalRuntime,
      getRowNumber: performanceOptimization.getRowNumber,
      getHeaderDuration: performanceOptimization.getHeaderDuration,
      calculateHeaderDuration: performanceOptimization.calculateHeaderDuration,
      
      // Core actions (from unified state)
      updateItem: unifiedState.updateItem,
      deleteRow: unifiedState.deleteRow,
      toggleFloatRow: unifiedState.toggleFloat,
      deleteMultipleItems: unifiedState.deleteMultipleItems,
      addItem: unifiedState.addRow,
      setTitle: unifiedState.setTitle,
      setStartTime: unifiedState.setStartTime,
      setTimezone: unifiedState.setTimezone,
      setShowDate: unifiedState.setShowDate,
      addRow: unifiedState.addRow,
      addHeader: unifiedState.addHeader,
      addRowAtIndex: unifiedState.addRow, // Simplified for now
      addHeaderAtIndex: unifiedState.addHeader, // Simplified for now
      
      // Column management
      addColumn: unifiedState.addColumn,
      updateColumnWidth: unifiedState.updateColumnWidth,
      setColumns: unifiedState.setColumns,
      
      // Showcaller controls (from unified showcaller)
      play: showcallerSync.play,
      pause: showcallerSync.pause,
      forward: showcallerSync.forward,
      backward: showcallerSync.backward,
      reset: showcallerSync.reset,
      jumpToSegment: showcallerSync.jumpToSegment,
      
      // Undo functionality
      undo: unifiedState.undo,
      canUndo: unifiedState.canUndo,
      lastAction: unifiedState.lastAction,
      
      // Helper functions
      calculateEndTime,
      addMultipleRows,
      markAsChanged: () => {}, // Handled internally
      
      // Autoscroll state
      autoScrollEnabled,
      toggleAutoScroll,
      
      // Header collapse functions
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      visibleItems,
      
      // Autosave coordination
      markActiveTyping: unifiedState.markActiveTyping
    },
    interactions,
    uiState,
    dragAndDrop: {} // Will be implemented in Phase 2
  };
};