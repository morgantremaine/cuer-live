import { usePersistedRundownState } from './usePersistedRundownState';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { usePerRowFeatureFlag } from './usePerRowFeatureFlag';
import { usePerRowRundownState } from './usePerRowRundownState';
import { usePerRowCompatibilityAdapter } from './usePerRowCompatibilityAdapter';
import { useRundownMetadata } from './useRundownMetadata';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';
import { useParams } from 'react-router-dom';

export const useRundownStateCoordination = () => {
  // Get user ID from auth and rundown ID from params
  const { user } = useAuth();
  const userId = user?.id;
  const params = useParams<{ id: string }>();
  const rundownId = params.id === 'new' ? null : params.id || null;

  // Feature flag for per-row persistence
  const { isEnabled: isPerRowEnabled } = usePerRowFeatureFlag();

  // Choose state management system based on feature flag
  const legacyState = usePersistedRundownState();
  const perRowState = usePerRowRundownState({
    rundownId: rundownId || '',
    enableRealtime: true
  });
  const metadata = useRundownMetadata({ rundownId: rundownId || '' });

  // Use per-row system if enabled and we have a valid rundown ID
  const shouldUsePerRow = isPerRowEnabled && rundownId && rundownId !== 'new';
  const activeState = shouldUsePerRow ? perRowState : legacyState;

  // Create compatibility adapter for per-row system
  const compatibilityAdapter = usePerRowCompatibilityAdapter({
    items: shouldUsePerRow ? perRowState.items : legacyState.items,
    onItemsChange: shouldUsePerRow ? 
      (items) => logger.debug('Per-row onItemsChange called', { count: items.length }) : 
      legacyState.setItems,
    updateItem: shouldUsePerRow ? 
      (itemId: string, field: string, value: any) => perRowState.updateItem(itemId, { [field]: value }) :
      legacyState.updateItem,
    deleteItem: shouldUsePerRow ? perRowState.deleteItem : (id) => {
      const newItems = legacyState.items.filter(item => item.id !== id);
      legacyState.setItems(newItems);
    },
    addItem: shouldUsePerRow ? 
      (item: any, index?: number) => perRowState.addItem(item, index) :
      (item: any, index?: number) => {
        const newItems = [...legacyState.items];
        if (typeof index === 'number') {
          newItems.splice(index, 0, item);
        } else {
          newItems.push(item);
        }
        legacyState.setItems(newItems);
      },
    reorderItems: shouldUsePerRow ? perRowState.reorderItems : legacyState.setItems,
    saveAllItems: shouldUsePerRow ? perRowState.saveAllItems : () => {
      // Legacy system doesn't have explicit save all, trigger autosave
      if (legacyState.markActiveTyping) {
        legacyState.markActiveTyping();
      }
    }
  });

  // Unified state interface
  const simplifiedState = shouldUsePerRow ? {
    ...perRowState,
    // Map per-row state to legacy interface
    rundownId: rundownId,
    rundownTitle: metadata.title,
    rundownStartTime: metadata.startTime,
    timezone: metadata.timezone,
    currentTime: new Date(),
    hasUnsavedChanges: perRowState.isSaving,
    isConnected: true, // Per-row system manages its own connection
    isProcessingRealtimeUpdate: false, // Per-row handles this internally
    selectedRowId: null, // TODO: Add to per-row state
    handleRowSelection: () => {}, // TODO: Add to per-row state
    clearRowSelection: () => {}, // TODO: Add to per-row state
    columns: [], // TODO: Get from user preferences
    setColumns: () => {}, // TODO: Wire to user preferences
    addColumn: () => {}, // TODO: Wire to user preferences
    updateColumnWidth: () => {}, // TODO: Wire to user preferences
    setTitle: metadata.updateTitle,
    setStartTime: metadata.updateStartTime,
    setTimezone: metadata.updateTimezone,

    addRow: () => {
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'regular' as const,
        name: '',
        duration: '00:00',
        startTime: '00:00:00',
        endTime: '00:00:00',
        elapsedTime: '00:00:00',
        isFloating: false,
        isFloated: false,
        talent: '',
        script: '',
        notes: '',
        gfx: '',
        video: '',
        images: '',
        color: '',
        customFields: {},
        rowNumber: (perRowState.items.length + 1).toString(),
        segmentName: ''
      };
      perRowState.addItem(newItem);
    },
    addHeader: () => {
      const newItem = {
        id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'header' as const,
        name: 'New Header',
        duration: '00:00',
        startTime: '00:00:00',
        endTime: '00:00:00',
        elapsedTime: '00:00:00',
        isFloating: false,
        isFloated: false,
        talent: '',
        script: '',
        notes: '',
        gfx: '',
        video: '',
        images: '',
        color: '',
        customFields: {},
        rowNumber: (perRowState.items.length + 1).toString(),
        segmentName: ''
      };
      perRowState.addItem(newItem);
    },
    deleteRow: compatibilityAdapter.deleteRow,
    toggleFloat: (itemId: string) => {
      const item = perRowState.items.find(item => item.id === itemId);
      if (item) {
        perRowState.updateItem(itemId, { isFloated: !item.isFloated });
      }
    },
    deleteMultipleItems: compatibilityAdapter.deleteMultipleItems,
    addItem: perRowState.addItem,
    setItems: compatibilityAdapter.setItems,
    updateItem: compatibilityAdapter.updateItem,
    markAsChanged: compatibilityAdapter.markAsChanged,
    markActiveTyping: () => {}, // Per-row handles this internally
    saveUndoState: () => {}, // TODO: Add undo to per-row
    undo: () => {}, // TODO: Add undo to per-row
    canUndo: false, // TODO: Add undo to per-row
    lastAction: null // TODO: Add undo to per-row
  } : legacyState;

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

  // Showcaller coordination for playback controls and visual state
  const showcallerCoordination = useShowcallerStateCoordination({
    items: performanceOptimization.calculatedItems,
    rundownId: simplifiedState.rundownId,
    userId,
    teamId: null,
    rundownTitle: simplifiedState.rundownTitle,
    rundownStartTime: simplifiedState.rundownStartTime
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
    if (shouldUsePerRow) {
      simplifiedState.addRow(); // Per-row system will handle indexing
    } else if ((simplifiedState as any).addRowAtIndex) {
      (simplifiedState as any).addRowAtIndex(insertIndex);
    } else {
      simplifiedState.addRow();
    }
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    if (shouldUsePerRow) {
      simplifiedState.addHeader(); // Per-row system will handle indexing
    } else if ((simplifiedState as any).addHeaderAtIndex) {
      (simplifiedState as any).addHeaderAtIndex(insertIndex);
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
    () => {}, // markStructuralChange - placeholder for now
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
    simplifiedState.columns
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
      isLoading: shouldUsePerRow ? false : (simplifiedState as any).isLoading || false,
      hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
      isSaving: simplifiedState.isSaving,
      isConnected: simplifiedState.isConnected || showcallerCoordination.isConnected,
      isProcessingRealtimeUpdate: contentProcessingState, // ONLY content updates for blue Wi-Fi
      
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
      visibleItems,
      
      // Autosave typing guard
      markActiveTyping: simplifiedState.markActiveTyping
    },
    interactions,
    uiState
  };
};
