import { useBulletproofRundownState } from './useBulletproofRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerStateCoordination } from './useShowcallerStateCoordination';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { useHeaderCollapse } from './useHeaderCollapse';
import { useAuth } from './useAuth';
import { useDragAndDrop } from './useDragAndDrop';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Single source of truth for all rundown state (bulletproof with offline support)
  const bulletproofState = useBulletproofRundownState();

  // Add performance optimization layer
  const performanceOptimization = useRundownPerformanceOptimization({
    items: bulletproofState.items,
    columns: bulletproofState.columns,
    startTime: bulletproofState.startTime
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
    rundownId: bulletproofState.rundownId,
    userId,
    teamId: null,
    rundownTitle: bulletproofState.title,
    rundownStartTime: bulletproofState.startTime
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
    
    bulletproofState.setItems([...bulletproofState.items, ...itemsToAdd]);
  };

  // Add the missing functions that bulletproof state should provide
  const addRowAtIndex = (insertIndex: number) => {
    const newItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular' as const,
      rowNumber: '',
      name: '',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      notes: '',
      gfx: '',
      video: '',
      images: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    bulletproofState.addItem(newItem);
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    const newHeader = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header' as const,
      rowNumber: '',
      name: 'New Header',
      startTime: '00:00:00',
      duration: '00:00',
      endTime: '00:00:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      notes: '',
      gfx: '',
      video: '',
      images: '',
      color: '',
      isFloating: false,
      customFields: {}
    };
    bulletproofState.addItem(newHeader);
  };

  // Get header collapse functions from useHeaderCollapse
  const { getHeaderGroupItemIds, isHeaderCollapsed, toggleHeaderCollapse, visibleItems } = useHeaderCollapse(performanceOptimization.calculatedItems);

  // UI interactions that depend on the core state
  const interactions = useRundownGridInteractions(
    // Use performance-optimized calculated items
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
        bulletproofState.setItems(updater(coreItems));
      } else {
        bulletproofState.setItems(updater);
      }
    },
    bulletproofState.updateItem,
    (item: any) => bulletproofState.addItem(item), // Wrapper to match interface
    () => {
      const newHeader = {
        id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'header' as const,
        rowNumber: '',
        name: 'New Header',
        startTime: '00:00:00',
        duration: '00:00',
        endTime: '00:00:00',
        elapsedTime: '00:00:00',
        talent: '',
        script: '',
        notes: '',
        gfx: '',
        video: '',
        images: '',
        color: '',
        isFloating: false,
        customFields: {}
      };
      bulletproofState.addItem(newHeader);
    },
    bulletproofState.deleteItem,
    bulletproofState.toggleFloat || (() => {}),
    bulletproofState.deleteMultipleItems || (() => {}),
    addMultipleRows,
    (columnId: string) => {
      const newColumns = bulletproofState.columns.filter(col => col.id !== columnId);
      bulletproofState.setColumns(newColumns);
    },
    calculateEndTime,
    (id: string, color: string) => {
      bulletproofState.updateItem(id, 'color', color);
    },
    () => {
      // markAsChanged - handled internally by bulletproof state
    },
    bulletproofState.setTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    // Pass undo-related parameters - use fallback if not available
    () => {}, // saveUndoState fallback
    () => {}, // markStructuralChange fallback
    bulletproofState.columns,
    bulletproofState.title,
    getHeaderGroupItemIds,
    isHeaderCollapsed
  );

  // Get UI state with enhanced navigation - use performance-optimized data
  const uiState = useRundownUIState(
    performanceOptimization.calculatedItems,
    performanceOptimization.visibleColumns,
    bulletproofState.updateItem,
    bulletproofState.setColumns,
    bulletproofState.columns
  );

  // Setup drag and drop with structural change integration
  const dragAndDrop = useDragAndDrop(
    performanceOptimization.calculatedItems,
    (items) => {
      // Update items through bulletproof state
      bulletproofState.setItems(items);
    },
    new Set<string>(), // selectedRows - placeholder for now
    undefined, // scrollContainerRef - placeholder for now
    () => {}, // saveUndoState fallback
    bulletproofState.columns,
    bulletproofState.title,
    getHeaderGroupItemIds,
    isHeaderCollapsed,
    () => {} // markStructuralChange fallback
  );

  // Simplified processing state
  const isProcessingRealtimeUpdate = bulletproofState.isSaving;

  return {
    coreState: {
      // Core data (performance optimized but same interface)
      items: performanceOptimization.calculatedItems,
      columns: bulletproofState.columns,
      visibleColumns: performanceOptimization.visibleColumns,
      rundownTitle: bulletproofState.title,
      rundownStartTime: bulletproofState.startTime,
      timezone: bulletproofState.timezone,
      showDate: bulletproofState.showDate,
      currentTime: bulletproofState.currentTime,
      rundownId: bulletproofState.rundownId,
      
      // State flags (NOW with separated processing states)
      isLoading: bulletproofState.isLoading,
      hasUnsavedChanges: bulletproofState.hasUnsavedChanges,
      isSaving: bulletproofState.isSaving,
      isConnected: bulletproofState.isConnected || showcallerCoordination.isConnected,
      isProcessingRealtimeUpdate, // Clean, simple content processing indicator
      
      // Network status from bulletproof system
      connectionType: bulletproofState.connectionType,
      staleness: bulletproofState.staleness,
      hasOfflineChanges: bulletproofState.hasOfflineChanges,
      
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
      selectedRowId: bulletproofState.selectedRowId,
      handleRowSelection: bulletproofState.handleRowSelection,
      clearRowSelection: () => bulletproofState.handleRowSelection(null),
      
      // Calculations (performance optimized)
      totalRuntime: performanceOptimization.totalRuntime,
      getRowNumber: performanceOptimization.getRowNumber,
      getHeaderDuration: performanceOptimization.getHeaderDuration,
      calculateHeaderDuration: performanceOptimization.calculateHeaderDuration,
      
      // Core actions
      updateItem: bulletproofState.updateItem,
      deleteRow: bulletproofState.deleteItem,
      toggleFloatRow: bulletproofState.toggleFloat || (() => {}),
      deleteMultipleItems: bulletproofState.deleteMultipleItems || (() => {}),
      addItem: bulletproofState.addItem,
      setTitle: bulletproofState.setTitle,
      setStartTime: bulletproofState.setStartTime,
      setTimezone: bulletproofState.setTimezone,
      setShowDate: bulletproofState.setShowDate,
      addRow: bulletproofState.addItem,
      addHeader: () => {
        const newHeader = {
          id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'header' as const,
          rowNumber: '',
          name: 'New Header',
          startTime: '00:00:00',
          duration: '00:00',
          endTime: '00:00:00',
          elapsedTime: '00:00:00',
          talent: '',
          script: '',
          notes: '',
          gfx: '',
          video: '',
          images: '',
          color: '',
          isFloating: false,
          customFields: {}
        };
        bulletproofState.addItem(newHeader);
      },
      addRowAtIndex,
      addHeaderAtIndex,
      
      // Column management
      addColumn: () => {}, // Column management handled separately
      updateColumnWidth: () => {}, // Column management handled separately
      setColumns: bulletproofState.setColumns,
      
      // Showcaller visual controls (completely separate from main state)
      play: showcallerCoordination.play,
      pause: showcallerCoordination.pause,
      forward: showcallerCoordination.forward,
      backward: showcallerCoordination.backward,
      reset: showcallerCoordination.reset,
      jumpToSegment: showcallerCoordination.jumpToSegment,
      
      // Undo functionality (simplified for now)
      undo: () => {}, // Undo handled by underlying state if available
      canUndo: false, // Simplified undo state
      lastAction: null, // Simplified undo state
      
      // Additional functionality
      calculateEndTime,
      markAsChanged: () => {
        // Handled internally by bulletproof state
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
      
      // Enhanced bulletproof features
      syncNow: bulletproofState.syncNow,
      saveNow: bulletproofState.saveNow,
      handleFieldChange: bulletproofState.handleFieldChange,
      
      // Simplified typing activity tracking
      markActiveTyping: () => {} // Handled internally by bulletproof state
    },
    interactions,
    uiState,
    dragAndDrop
  };
};