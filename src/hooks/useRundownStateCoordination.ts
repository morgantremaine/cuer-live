
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { useRundownPerformanceOptimization } from './useRundownPerformanceOptimization';
import { useRundownFindReplace } from './useRundownFindReplace';
import { useAuth } from './useAuth';
import { UnifiedRundownState } from '@/types/interfaces';
import { useState, useEffect, useMemo } from 'react';
import { logger } from '@/utils/logger';

export const useRundownStateCoordination = () => {
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Single source of truth for all rundown state (NO showcaller interference)
  const simplifiedState = useSimplifiedRundownState();

  // Add performance optimization layer
  const performanceOptimization = useRundownPerformanceOptimization({
    items: simplifiedState.items,
    columns: simplifiedState.columns,
    startTime: simplifiedState.rundownStartTime
  });

  // Find and Replace functionality
  const findReplace = useRundownFindReplace(
    performanceOptimization.calculatedItems,
    simplifiedState.updateItem
  );

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
  const showcallerVisual = useShowcallerVisualState({
    items: simplifiedState.items,
    rundownId: simplifiedState.rundownId,
    userId: userId
  });

  // Separate realtime sync for showcaller visual state only  
  const showcallerSync = useShowcallerRealtimeSync({
    rundownId: simplifiedState.rundownId,
    onExternalVisualStateReceived: showcallerVisual.applyExternalVisualState,
    enabled: !!simplifiedState.rundownId
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
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
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

  // UI interactions that depend on the core state (NO showcaller interference)
  const interactions = useRundownGridInteractions(
    performanceOptimization.calculatedItems,
    (updater) => {
      if (typeof updater === 'function') {
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
    () => {},
    simplifiedState.setTitle,
    addRowAtIndex,
    addHeaderAtIndex,
    simplifiedState.saveUndoState,
    simplifiedState.columns,
    simplifiedState.rundownTitle
  );

  // Get UI state with enhanced navigation
  const uiState = useRundownUIState(
    performanceOptimization.calculatedItems,
    performanceOptimization.visibleColumns,
    simplifiedState.updateItem,
    simplifiedState.setColumns,
    simplifiedState.columns
  );

  // Keyboard shortcut for find and replace
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        findReplace.setIsOpen(true);
      }
      if (e.key === 'Escape' && findReplace.isOpen) {
        findReplace.close();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [findReplace.isOpen, findReplace.setIsOpen, findReplace.close]);

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
      
      // State flags (NO showcaller interference)
      isLoading: simplifiedState.isLoading,
      hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
      isSaving: simplifiedState.isSaving,
      isConnected: simplifiedState.isConnected || showcallerSync.isConnected,
      isProcessingRealtimeUpdate: simplifiedState.isProcessingRealtimeUpdate,
      
      // Showcaller visual state from completely separate system
      currentSegmentId: showcallerVisual.currentSegmentId,
      isPlaying: showcallerVisual.isPlaying,
      timeRemaining: showcallerVisual.timeRemaining,
      isController: showcallerVisual.isController,
      showcallerActivity: false,
      
      // Visual status overlay function (doesn't touch main state)
      getItemVisualStatus: showcallerVisual.getItemVisualStatus,
      
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
      play: showcallerVisual.play,
      pause: showcallerVisual.pause,
      forward: showcallerVisual.forward,
      backward: showcallerVisual.backward,
      reset: showcallerVisual.reset,
      jumpToSegment: showcallerVisual.jumpToSegment,
      
      // Undo functionality
      undo: simplifiedState.undo,
      canUndo: simplifiedState.canUndo,
      lastAction: simplifiedState.lastAction,
      
      // Additional functionality
      calculateEndTime,
      markAsChanged: () => {},
      addMultipleRows,
      
      // Autoscroll state
      autoScrollEnabled,
      toggleAutoScroll,

      // Find & Replace functionality
      findReplaceState: {
        isOpen: findReplace.isOpen,
        searchTerm: findReplace.searchTerm,
        replaceTerm: findReplace.replaceTerm,
        caseSensitive: findReplace.caseSensitive,
        totalMatches: findReplace.totalMatches,
        currentMatchIndex: findReplace.currentMatchIndex,
        hasMatches: findReplace.hasMatches,
        onSearchChange: findReplace.setSearchTerm,
        onReplaceChange: findReplace.setReplaceTerm,
        onCaseSensitiveChange: findReplace.setCaseSensitive,
        onNext: findReplace.goToNext,
        onPrevious: findReplace.goToPrevious,
        onReplaceCurrent: findReplace.replaceCurrent,
        onReplaceAll: findReplace.replaceAll,
        onClose: findReplace.close,
        onToggle: () => findReplace.setIsOpen(!findReplace.isOpen)
      }
    },
    interactions,
    uiState
  };
};
