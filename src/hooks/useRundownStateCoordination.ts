import { usePersistedRundownState } from './usePersistedRundownState';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Single source of truth for all rundown state (with persistence)
  const simplifiedState = usePersistedRundownState();

  // Add performance optimization layer
  const performanceOptimization = useRundownPerformanceOptimization({
    items: simplifiedState.items,
    columns: simplifiedState.columns,
    startTime: simplifiedState.rundownStartTime
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

  // Completely separate showcaller visual state management
  const showcallerCoordination = useShowcallerStateCoordination({
    items: simplifiedState.items,
    rundownId: simplifiedState.rundownId,
    userId: userId,
    teamId: null, // Will be populated when team context is available
    rundownTitle: simplifiedState.rundownTitle,
    rundownStartTime: simplifiedState.rundownStartTime,
  });

  // Helper function to calculate end time - memoized for performance
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

  // Add the missing addMultipleRows function
  const addMultipleRows = (newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    simplifiedState.setItems(itemsToAdd);
  };

  // Add the missing functions that simplifiedState should provide
  const addRowAtIndex = (insertIndex: number) => {
    if (simplifiedState.addRowAtIndex) {
      simplifiedState.addRowAtIndex(insertIndex);
    } else {
      simplifiedState.addRow();
    }
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    if (simplifiedState.addHeaderAtIndex) {
      simplifiedState.addHeaderAtIndex(insertIndex);
    } else {
      simplifiedState.addHeader();
    }
  };

  // Get header collapse functions from useHeaderCollapse
  const { getHeaderGroupItemIds, isHeaderCollapsed, toggleHeaderCollapse, visibleItems } = useHeaderCollapse(performanceOptimization.calculatedItems);

  // UI interactions that depend on the core state (NO showcaller interference)
  // Now passing undo-related parameters
  const interactions = useRundownGridInteractions(
    // Use performance-optimized calculated items, but still pass the original updateItem function
    performanceOptimization.calculatedItems,
    (updater) => {
      if (typeof updater === 'function') {
        // Extract just the core RundownItem properties for the updater
        const coreItems = performanceOptimization.calculatedItems.map(item => ({
          id: item.id,
          type: item.type,
          name: item.name,
          duration: item.duration,
          startTime: item.startTime,
          endTime: item.endTime,
          elapsedTime: item.elapsedTime,
          isFloating: item.isFloating,
          isFloated: item.isFloated,
          talent: item.talent,
          script: item.script,
          notes: item.notes,
          gfx: item.gfx,
          video: item.video,
          images: item.images,
          color: item.color,
          customFields: item.customFields,
          rowNumber: item.rowNumber,
          segmentName: item.segmentName
        }));
        simplifiedState.setItems(updater(coreItems));
      } else {
        simplifiedState.setItems(updater);
      }
    },
    simplifiedState.updateItem,
    simplifiedState.addRow,
    simplifiedState.addHeader,
    simplifiedState.deleteRow,
    simplifiedState.toggleFloat,
    simplifiedState.deleteMultipleItems,
    addMultipleRows,
    (columnId: string) => {
      const newColumns = simplifiedState.columns.filter(col => col.id !== columnId);
      simplifiedState.setColumns(newColumns);
    },
    calculateEndTime,
    (id: string, color: string) => {
      simplifiedState.updateItem(id, 'color', color);
    },
    () => {
      // markAsChanged - handled internally by simplified state
    },
    simplifiedState.setTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    // Pass undo-related parameters - use the correct property name now available
    simplifiedState.saveUndoState,
    simplifiedState.columns,
    simplifiedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed
  );

  // Get UI state with enhanced navigation - use performance-optimized data
  const uiState = useRundownUIState(
    performanceOptimization.calculatedItems,
    performanceOptimization.visibleColumns,
    simplifiedState.updateItem,
    simplifiedState.setColumns,
    simplifiedState.columns,
    simplifiedState.saveUndoState,
    simplifiedState.rundownTitle
  );

  // NEW: Keep processing states separate - NO combination
  const contentProcessingState = simplifiedState.isProcessingRealtimeUpdate; // Content updates only
  const showcallerProcessingState = showcallerCoordination.isProcessingVisualUpdate; // Showcaller only

  return {
    coreState: {
      // Core data (performance optimized but same interface)
      items: performanceOptimization.calculatedItems,
      columns: simplifiedState.columns,
      visibleColumns: performanceOptimization.visibleColumns,
      rundownTitle: simplifiedState.rundownTitle,
      rundownStartTime: simplifiedState.rundownStartTime,
      timezone: simplifiedState.timezone,
      currentTime: simplifiedState.currentTime,
      rundownId: simplifiedState.rundownId,
      
      // State flags (NOW with separated processing states)
      isLoading: simplifiedState.isLoading,
      hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
      isSaving: simplifiedState.isSaving,
      isConnected: simplifiedState.isConnected || showcallerCoordination.isConnected,
      isProcessingRealtimeUpdate: contentProcessingState, // ONLY content updates for blue Wi-Fi
      
      // Showcaller visual state from completely separate system
      currentSegmentId: showcallerCoordination.currentSegmentId,
      isPlaying: showcallerCoordination.isPlaying,
      timeRemaining: showcallerCoordination.timeRemaining,
      isController: showcallerCoordination.isController,
      showcallerActivity: false, // No longer interferes with main state
      
      // Visual status overlay function (doesn't touch main state)
      getItemVisualStatus: showcallerCoordination.getItemVisualStatus,
      
      // Selection state
      selectedRowId: simplifiedState.selectedRowId,
      handleRowSelection: simplifiedState.handleRowSelection,
      clearRowSelection: simplifiedState.clearRowSelection,
      
      // Calculations (performance optimized)
      totalRuntime: performanceOptimization.totalRuntime,
      getRowNumber: performanceOptimization.getRowNumber,
      getHeaderDuration: performanceOptimization.getHeaderDuration,
      calculateHeaderDuration: performanceOptimization.calculateHeaderDuration,
      
      // Core actions (NO showcaller interference)
      updateItem: simplifiedState.updateItem,
      deleteRow: simplifiedState.deleteRow,
      toggleFloatRow: simplifiedState.toggleFloat,
      deleteMultipleItems: simplifiedState.deleteMultipleItems,
      addItem: simplifiedState.addItem,
      setTitle: simplifiedState.setTitle,
      setStartTime: simplifiedState.setStartTime,
      setTimezone: simplifiedState.setTimezone,
      addRow: simplifiedState.addRow,
      addHeader: simplifiedState.addHeader,
      addRowAtIndex,
      addHeaderAtIndex,
      
      // Column management
      addColumn: simplifiedState.addColumn,
      updateColumnWidth: simplifiedState.updateColumnWidth,
      setColumns: simplifiedState.setColumns,
      
      // Showcaller visual controls (completely separate from main state)
      play: showcallerCoordination.play,
      pause: showcallerCoordination.pause,
      forward: showcallerCoordination.forward,
      backward: showcallerCoordination.backward,
      reset: showcallerCoordination.reset,
      jumpToSegment: showcallerCoordination.jumpToSegment,
      
      // Undo functionality
      undo: simplifiedState.undo,
      canUndo: simplifiedState.canUndo,
      lastAction: simplifiedState.lastAction,
      
      // Additional functionality
      calculateEndTime,
      markAsChanged: () => {
        // Handled internally by simplified state
      },
      addMultipleRows,
      
      // Autoscroll state with enhanced debugging
      autoScrollEnabled,
      toggleAutoScroll,
      
      // Header collapse functions
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      visibleItems
    },
    interactions,
    uiState
  };
};
