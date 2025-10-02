import { usePersistedRundownState } from './usePersistedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { usePerformanceMonitoring } from './usePerformanceMonitoring';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { useDragAndDrop } from './useDragAndDrop';
import { useOperationBasedRundown } from './useOperationBasedRundown';
import { arrayMove } from '@dnd-kit/sortable';
import { calculateEndTime } from '@/utils/rundownCalculations';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Stable connection state - once connected, stay connected
  const [stableIsConnected, setStableIsConnected] = useState(false);
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Ref to store interactions once they're created
  const interactionsRef = useRef<any>(null);

  // Single source of truth for all rundown state (with persistence)  
  // Get rundownId first, but tell it NOT to create operation system
  const persistedState = usePersistedRundownState('SKIP_OPERATION_SYSTEM');

  // Initialize operation-based system (THE PRIMARY system - always enabled)
  // This is THE ONLY operation system that should exist in the real rundown
  const operationSystem = useOperationBasedRundown({
    rundownId: persistedState.rundownId || '',
    userId: userId || '',
    enabled: true, // Always enabled - OT is THE system
    skipHistoricalOperations: true // Start fresh - don't load historical operations
  });

  // Always use operation system items as the single source of truth
  const activeItems = operationSystem.items;

  // Add performance optimization layer - use operation-based items
  const performanceOptimization = useRundownPerformanceOptimization({
    items: activeItems,
    columns: persistedState.columns,
    startTime: persistedState.rundownStartTime
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
    teamId: null,
    rundownTitle: persistedState.rundownTitle,
    rundownStartTime: persistedState.rundownStartTime,
    setShowcallerUpdate: undefined // Add this when change tracking is available
  });


  // Wrapped update handlers that route through operation system (always)
  const wrappedUpdateItem = (id: string, field: string, value: any) => {
    operationSystem.handleCellEdit(id, field, value);
  };

  const wrappedDeleteRow = (id: string) => {
    operationSystem.handleRowDelete(id);
  };

  // Add the missing addMultipleRows function - route through operation system
  const addMultipleRows = (newItems: any[], calcEndTime: (startTime: string, duration: string) => string) => {
    const itemsToAdd = newItems.map((item, index) => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    // Add each item through operation system
    itemsToAdd.forEach((item, index) => {
      operationSystem.handleRowInsert(activeItems.length + index, item);
    });
  };

  // Route structural operations through operation system
  const addRowAtIndex = (insertIndex: number, count?: number) => {
    console.log('🟠 useRundownStateCoordination addRowAtIndex called with:', { insertIndex, count });
    const rowsToAdd = count || 1;
    for (let i = 0; i < rowsToAdd; i++) {
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'regular',
        rowNumber: '',
        name: '',
        startTime: '',
        duration: '',
        endTime: '',
        elapsedTime: '',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '',
        isFloating: false,
        customFields: {}
      };
      operationSystem.handleRowInsert(insertIndex + i, newItem);
    }
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    console.log('🟠 useRundownStateCoordination addHeaderAtIndex called with:', { insertIndex });
    const newHeader = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: 'A',
      name: '',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      images: '',
      notes: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    operationSystem.handleRowInsert(insertIndex, newHeader);
  };

  // Add move up/down functions for mobile context menu - route through operation system
  const moveItemUp = (index: number) => {
    console.log('🔄 Moving item up:', { index, itemsLength: activeItems.length });
    if (index > 0) {
      console.log('🔄 Moving item from', index, 'to', index - 1);
      operationSystem.handleRowMove(index, index - 1);
    }
  };

  const moveItemDown = (index: number) => {
    console.log('🔄 Moving item down:', { index, itemsLength: activeItems.length });
    if (index < activeItems.length - 1) {
      console.log('🔄 Moving item from', index, 'to', index + 1);
      operationSystem.handleRowMove(index, index + 1);
    }
  };

  // Get header collapse functions from useHeaderCollapse
  const { getHeaderGroupItemIds, isHeaderCollapsed, toggleHeaderCollapse, visibleItems } = useHeaderCollapse(performanceOptimization.calculatedItems);

  // Setup drag and drop - route through operation system
  const dragAndDrop = useDragAndDrop(
    performanceOptimization.calculatedItems,
    (items) => {
      // Find what changed and route through operation system
      const oldItems = activeItems;
      // For drag and drop, find the moved item
      for (let i = 0; i < items.length; i++) {
        if (items[i].id !== oldItems[i]?.id) {
          // Find where the item came from
          const movedItemId = items[i].id;
          const oldIndex = oldItems.findIndex(item => item.id === movedItemId);
          if (oldIndex !== -1 && oldIndex !== i) {
            operationSystem.handleRowMove(oldIndex, i);
            return;
          }
        }
      }
    },
    () => interactionsRef.current?.selectedRows || new Set<string>(), // Get selectedRows from interactions when available
    undefined, // scrollContainerRef - placeholder for now
    persistedState.saveUndoState,
    persistedState.columns,
    persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    persistedState.markStructuralChange,
    persistedState.rundownId, // Pass rundownId for broadcasts
    userId // Pass userId for broadcasts
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
    wrappedUpdateItem, // Route through operation system
    persistedState.addRow,
    persistedState.addHeader,
    wrappedDeleteRow, // Route through operation system
    persistedState.toggleFloat,
    persistedState.deleteMultipleItems,
    addMultipleRows,
    (columnId: string) => {
      const newColumns = persistedState.columns.filter(col => col.id !== columnId);
      persistedState.setColumns(newColumns);
    },
    calculateEndTime,
    (id: string, color: string) => {
      wrappedUpdateItem(id, 'color', color); // Route through operation system
    },
    () => {
      // markAsChanged - handled internally by persisted state
    },
    persistedState.setTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    // Pass undo-related parameters - use the correct property name now available
    persistedState.saveUndoState,
    persistedState.markStructuralChange, // Wire structural change signaling
    persistedState.columns,
    persistedState.rundownTitle,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    persistedState.rundownId,
    userId,
    false, // isPerCellEnabled - not used in coordination state (uses unified system)
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
      timezone: persistedState.timezone,
      showDate: persistedState.showDate,
      currentTime: persistedState.currentTime,
      rundownId: persistedState.rundownId,
      
      // State flags - always use operation system
      isLoading: operationSystem.isLoading,
      hasUnsavedChanges: false, // Operation system handles saves automatically
      isSaving: false, // Operation system handles saves automatically
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
      
      // Core actions - route through operation system
      updateItem: wrappedUpdateItem,
      deleteRow: wrappedDeleteRow,
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
      
      // Undo/Redo functionality
      undo: persistedState.undo,
      redo: persistedState.redo,
      canUndo: persistedState.canUndo,
      canRedo: persistedState.canRedo,
      lastAction: persistedState.lastAction,
      nextAction: persistedState.nextAction,
      
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
      visibleItems,
      
      // Autosave typing guard
      markActiveTyping: persistedState.markActiveTyping,
      
      // Move functions for mobile
      moveItemUp,
      moveItemDown,
      
      // Expose operation system for child hooks (prevents duplicate instances)
      operationSystem
    },
    interactions,
    uiState,
    dragAndDrop
  };
};
