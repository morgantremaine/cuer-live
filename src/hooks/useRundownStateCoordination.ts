import { usePersistedRundownState } from './usePersistedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useLocalCollapsedHeaders } from './useLocalCollapsedHeaders';
import { useAuth } from './useAuth';
import { useTeamId } from './useTeamId';
import { useDragAndDrop } from './useDragAndDrop';
import { arrayMove } from '@dnd-kit/sortable';
import { getTabId } from '@/utils/tabUtils';
import { calculateEndTime } from '@/utils/rundownCalculations';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/utils/logger';
import { cellBroadcast } from '@/utils/cellBroadcast';

export const useRundownStateCoordination = () => {
  // Stable connection state - once connected, stay connected
  const [stableIsConnected, setStableIsConnected] = useState(false);
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;
  
  // Get team ID
  const { teamId } = useTeamId();

  // Ref to store interactions once they're created
  const interactionsRef = useRef<any>(null);

  // Single source of truth for all rundown state (with persistence)
  const persistedState = usePersistedRundownState();
  
  // Add performance optimization layer
  const performanceOptimization = useRundownPerformanceOptimization({
    items: persistedState.items,
    columns: persistedState.columns,
    startTime: persistedState.rundownStartTime,
    numberingLocked: persistedState.numberingLocked,
    lockedRowNumbers: persistedState.lockedRowNumbers,
    endTime: persistedState.rundownEndTime
  });

  // Add performance monitoring for large rundowns
  const performanceMonitoring = usePerformanceMonitoring({
    rundownId: persistedState.rundownId,
    itemCount: persistedState.items?.length || 0,
    enabled: true
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

  // Showcaller coordination for playback controls and visual state
  const showcallerCoordination = useShowcallerStateCoordination({
    items: performanceOptimization.calculatedItems,
    rundownId: persistedState.rundownId,
    userId,
    teamId: teamId || null,
    rundownTitle: persistedState.rundownTitle,
    rundownStartTime: persistedState.rundownStartTime,
    setShowcallerUpdate: undefined // Add this when change tracking is available
  });


  // Add the missing addMultipleRows function
  const addMultipleRows = (newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    persistedState.setItems(itemsToAdd);
  };

  // Add the missing functions that simplifiedState should provide
  const addRowAtIndex = (insertIndex: number) => {
    if (persistedState.addRowAtIndex) {
      persistedState.addRowAtIndex(insertIndex);
    } else {
      persistedState.addRow();
    }
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    if (persistedState.addHeaderAtIndex) {
      persistedState.addHeaderAtIndex(insertIndex);
    } else {
      persistedState.addHeader();
    }
  };

  // Add move up/down functions for mobile context menu
  const moveItemUp = (index: number) => {
    console.log('🔄 Moving item up:', { index, itemsLength: performanceOptimization.calculatedItems.length });
    if (index > 0) {
      const currentItems = performanceOptimization.calculatedItems;
      const newItems = arrayMove(currentItems, index, index - 1);
      console.log('🔄 Moving item from', index, 'to', index - 1);
      persistedState.setItems(newItems);
      
      // Broadcast reorder for immediate realtime sync (dual broadcasting)
      if (persistedState.rundownId && userId) {
        const order = newItems.map(item => item.id);
        cellBroadcast.broadcastCellUpdate(
          persistedState.rundownId,
          undefined,
          'items:reorder',
          { order },
          userId,
          getTabId()
        );
        console.log('📡 Broadcasting moveUp reorder:', { orderLength: order.length });
      }
      
      // Trigger structural operation for database persistence
      if (persistedState.markStructuralChange) {
        const order = newItems.map(item => item.id);
        persistedState.markStructuralChange('reorder', { order });
        console.log('🏗️ Triggered structural operation for moveUp');
      }
    }
  };

  const moveItemDown = (index: number) => {
    const currentItems = performanceOptimization.calculatedItems;
    console.log('🔄 Moving item down:', { index, itemsLength: currentItems.length });
    if (index < currentItems.length - 1) {
      const newItems = arrayMove(currentItems, index, index + 1);
      console.log('🔄 Moving item from', index, 'to', index + 1);
      persistedState.setItems(newItems);
      
      // Broadcast reorder for immediate realtime sync (dual broadcasting)
      if (persistedState.rundownId && userId) {
        const order = newItems.map(item => item.id);
        cellBroadcast.broadcastCellUpdate(
          persistedState.rundownId,
          undefined,
          'items:reorder',
          { order },
          userId,
          getTabId()
        );
        console.log('📡 Broadcasting moveDown reorder:', { orderLength: order.length });
      }
      
      // Trigger structural operation for database persistence
      if (persistedState.markStructuralChange) {
        const order = newItems.map(item => item.id);
        persistedState.markStructuralChange('reorder', { order });
        console.log('🏗️ Triggered structural operation for moveDown');
      }
    }
  };

  // Get header collapse functions from useHeaderCollapse with localStorage persistence
  const { collapsedHeaders: persistedCollapsedHeaders, updateCollapsedHeaders } = useLocalCollapsedHeaders(persistedState.rundownId || '');
  const { collapsedHeaders, getHeaderGroupItemIds, isHeaderCollapsed, toggleHeaderCollapse, visibleItems } = useHeaderCollapse(
    performanceOptimization.calculatedItems,
    persistedCollapsedHeaders
  );

  // Sync collapsed headers changes to localStorage (only when contents actually change)
  useEffect(() => {
    const currentIds = Array.from(collapsedHeaders).sort().join(',');
    const persistedIds = Array.from(persistedCollapsedHeaders).sort().join(',');
    
    // Only sync if contents actually differ
    if (currentIds !== persistedIds) {
      console.log('💾 Syncing collapsed headers to localStorage:', Array.from(collapsedHeaders));
      updateCollapsedHeaders(collapsedHeaders);
    }
  }, [collapsedHeaders, persistedCollapsedHeaders, updateCollapsedHeaders]);

  // Setup drag and drop with structural change integration - initialized early
  const dragAndDrop = useDragAndDrop(
    performanceOptimization.calculatedItems,
    (items) => {
      // Update items through persisted state
      persistedState.setItems(items);
      // Clear structural change flag after items are set
      setTimeout(() => persistedState.clearStructuralChange(), 50);
    },
    () => interactionsRef.current?.selectedRows || new Set<string>(), // Get selectedRows from interactions when available
    undefined, // scrollContainerRef - placeholder for now
    undefined, // saveUndoState - removed, using recordOperation instead
    persistedState.columns,
    persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    persistedState.markStructuralChange,
    persistedState.rundownId, // Pass rundownId for broadcasts
    userId, // Pass userId for broadcasts
    persistedState.recordOperation // Pass recordOperation for operation-based undo
  );

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
        persistedState.setItems(updater(coreItems));
      } else {
        persistedState.setItems(updater);
      }
    },
    persistedState.updateItem,
    persistedState.addRow,
    persistedState.addHeader,
    persistedState.deleteRow,
    persistedState.toggleFloat,
    persistedState.deleteMultipleItems,
    addMultipleRows,
    (columnId: string) => {
      const newColumns = persistedState.columns.filter(col => col.id !== columnId);
      persistedState.setColumns(newColumns);
    },
    calculateEndTime,
    (id: string, color: string) => {
      persistedState.updateItem(id, 'color', color);
    },
    () => {
      // markAsChanged - handled internally by persisted state
    },
    persistedState.setTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    // Pass undo-related parameters - using recordOperation instead of saveUndoState
    undefined, // saveUndoState - removed, using operation-based undo
    persistedState.markStructuralChange, // Wire structural change signaling
    persistedState.columns,
    persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    persistedState.rundownId,
    userId,
    persistedState.recordOperation,
    persistedState.finalizeAllTypingSessions,
    // Pass drag state from the primary drag instance and use the real selectedRows
    {
      draggedItemIndex: dragAndDrop.draggedItemIndex,
      isDraggingMultiple: dragAndDrop.isDraggingMultiple,
      dropTargetIndex: dragAndDrop.dropTargetIndex,
      handleDragStart: dragAndDrop.handleDragStart,
      handleDragOver: dragAndDrop.handleDragOver,
      handleDragLeave: dragAndDrop.handleDragLeave,
      handleDrop: dragAndDrop.handleDrop,
      handleDragEnd: dragAndDrop.handleDragEnd,
      resetDragState: dragAndDrop.resetDragState
    }
  );

  // Store interactions ref for drag and drop access
  interactionsRef.current = interactions;

  // Get UI state with enhanced navigation - use performance-optimized data
  const uiState = useRundownUIState(
    performanceOptimization.calculatedItems,
    performanceOptimization.visibleColumns,
    persistedState.updateItem,
    persistedState.setColumns,
    persistedState.columns
  );

  // dragAndDrop is now defined above before interactions
  
  // Update stable connection state only when rundown is truly ready
  useEffect(() => {
    if (persistedState.rundownId && !persistedState.isLoading && !stableIsConnected) {
      setStableIsConnected(true);
    }
  }, [persistedState.rundownId, persistedState.isLoading, stableIsConnected]);

  // Simplified processing state - no teleprompter interference
  const isProcessingRealtimeUpdate = persistedState.isProcessingRealtimeUpdate;

  return {
    coreState: {
      // Core data (performance optimized but same interface)
      items: performanceOptimization.calculatedItems,
      columns: persistedState.columns,
      visibleColumns: performanceOptimization.visibleColumns,
      rundownTitle: persistedState.rundownTitle,
      rundownStartTime: persistedState.rundownStartTime,
      rundownEndTime: persistedState.rundownEndTime,
      timezone: persistedState.timezone,
      showDate: persistedState.showDate,
      currentTime: persistedState.currentTime,
      rundownId: persistedState.rundownId,
      
      // Row numbering lock state
      numberingLocked: persistedState.numberingLocked,
      lockedRowNumbers: persistedState.lockedRowNumbers,
      
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
      setEndTime: persistedState.setEndTime,
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
      
      // Undo/Redo functionality
      undo: persistedState.undo,
      canUndo: persistedState.canUndo,
      lastAction: persistedState.lastAction,
      redo: persistedState.redo,
      canRedo: persistedState.canRedo,
      nextRedoAction: persistedState.nextRedoAction,
      
      // Additional functionality
      calculateEndTime,
      markAsChanged: () => {
        // Handled internally by simplified state
      },
      addMultipleRows,
      
      // Autoscroll state with enhanced debugging
      autoScrollEnabled,
      toggleAutoScroll,
      
      // Row numbering lock toggle
      toggleLock: persistedState.toggleLock,
      
      // Header collapse functions
      toggleHeaderCollapse,
      isHeaderCollapsed,
      getHeaderGroupItemIds,
      visibleItems,
      
      // Autosave typing guard
      markActiveTyping: persistedState.markActiveTyping,
      
      // Move functions for mobile
      moveItemUp,
      moveItemDown
    },
    interactions,
    uiState,
    dragAndDrop
  };
};
