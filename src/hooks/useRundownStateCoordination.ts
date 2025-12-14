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
import { useMOSIntegration } from './useMOSIntegration';
import { getTabId } from '@/utils/tabUtils';
import { calculateEndTime } from '@/utils/rundownCalculations';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo, useRef } from 'react';
import { logger } from '@/utils/logger';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { generateKeyBetween, compareSortOrder } from '@/utils/fractionalIndex';

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
  
  // Initialize MOS integration
  const { handleSegmentChange, handleEditorialChange } = useMOSIntegration({
    teamId: teamId || '',
    rundownId: persistedState.rundownId || '',
    enabled: !!teamId && !!persistedState.rundownId,
  });
  
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

  // Add move up/down functions for mobile context menu - using fractional indexing
  const moveItemUp = (index: number) => {
    console.log('🔄 Moving item up:', { index, itemsLength: performanceOptimization.calculatedItems.length });
    if (index > 0) {
      const currentItems = performanceOptimization.calculatedItems;
      const movedItem = currentItems[index];
      const targetIndex = index - 1;
      
      // Calculate new sortOrder for the moved item
      // It should go between item at targetIndex-1 and item at targetIndex
      const prevItem = targetIndex > 0 ? currentItems[targetIndex - 1] : null;
      const nextItem = currentItems[targetIndex]; // The item we're moving before
      
      const prevSortOrder = prevItem?.sortOrder || null;
      const nextSortOrder = nextItem?.sortOrder || null;
      
      const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder);
      
      console.log('📊 MoveUp sortOrder:', { 
        prevSortOrder, 
        nextSortOrder, 
        newSortOrder,
        movedItemId: movedItem.id
      });
      
      // Update local state with new sortOrder
      const updatedItems = currentItems.map(item => 
        item.id === movedItem.id ? { ...item, sortOrder: newSortOrder } : item
      );
      // Re-sort by sortOrder
      const sortedItems = [...updatedItems].sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
      
      // Use setItemsSync to update stateRef synchronously before broadcasts can interfere
      persistedState.setItemsSync(sortedItems);
      
      // Use fractional indexing broadcast instead of structural reorder
      if (persistedState.trackSortOrderChange) {
        persistedState.trackSortOrderChange(movedItem.id, newSortOrder);
      }
    }
  };

  const moveItemDown = (index: number) => {
    const currentItems = performanceOptimization.calculatedItems;
    console.log('🔄 Moving item down:', { index, itemsLength: currentItems.length });
    if (index < currentItems.length - 1) {
      const movedItem = currentItems[index];
      const targetIndex = index + 1;
      
      // Calculate new sortOrder for the moved item
      // It should go between item at targetIndex and item at targetIndex+1
      const prevItem = currentItems[targetIndex]; // The item we're moving after
      const nextItem = targetIndex + 1 < currentItems.length ? currentItems[targetIndex + 1] : null;
      
      const prevSortOrder = prevItem?.sortOrder || null;
      const nextSortOrder = nextItem?.sortOrder || null;
      
      const newSortOrder = generateKeyBetween(prevSortOrder, nextSortOrder);
      
      console.log('📊 MoveDown sortOrder:', { 
        prevSortOrder, 
        nextSortOrder, 
        newSortOrder,
        movedItemId: movedItem.id
      });
      
      // Update local state with new sortOrder
      const updatedItems = currentItems.map(item => 
        item.id === movedItem.id ? { ...item, sortOrder: newSortOrder } : item
      );
      // Re-sort by sortOrder
      const sortedItems = [...updatedItems].sort((a, b) => compareSortOrder(a.sortOrder, b.sortOrder));
      
      // Use setItemsSync to update stateRef synchronously before broadcasts can interfere
      persistedState.setItemsSync(sortedItems);
      
      // Use fractional indexing broadcast instead of structural reorder
      if (persistedState.trackSortOrderChange) {
        persistedState.trackSortOrderChange(movedItem.id, newSortOrder);
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
      // CRITICAL: Use setItemsSync to update stateRef synchronously
      // This prevents race conditions where incoming sortOrder broadcasts read stale stateRef.current
      // and overwrite the pending local drag state, causing drags to "revert"
      persistedState.setItemsSync(items);
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
    persistedState.recordOperation, // Pass recordOperation for operation-based undo
    handleEditorialChange, // Pass MOS editorial change handler
    persistedState.setDragActive, // BROADCAST-FIRST: Block reorder broadcasts during drag
    persistedState.trackSortOrderChange // Fractional indexing: track sortOrder changes
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
    (id: string, onEditorialChangeCallback?: (segmentId: string, segmentData?: any, eventType?: string) => void) => {
      // Wrapper that passes the editorial change handler
      persistedState.toggleFloat(id);
      // Call MOS handler after state change if provided
      if (onEditorialChangeCallback) {
        const item = performanceOptimization.calculatedItems.find(i => i.id === id);
        if (item) {
          onEditorialChangeCallback(id, { ...item, isFloating: !item.isFloating }, 'UPDATE');
        }
      }
    },
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
      saveCompletionCount: persistedState.saveCompletionCount,
      failedSavesCount: persistedState.failedSavesCount,
      onRetryFailedSaves: persistedState.onRetryFailedSaves,
      saveError: persistedState.saveError,
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
    dragAndDrop,
    mosIntegration: {
      handleSegmentChange,
      handleEditorialChange
    }
  };
};
