
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { useAuth } from './useAuth';
import { UnifiedRundownState } from '@/types/interfaces';

export const useRundownStateCoordination = () => {
  // Get user ID from auth
  const { user } = useAuth();
  const userId = user?.id;

  // Single source of truth for all rundown state (NO showcaller interference)
  const simplifiedState = useSimplifiedRundownState();

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

  // Helper function to calculate end time
  const calculateEndTime = (startTime: string, duration: string) => {
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
  };

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
    console.log('🚀 StateCoordination addRowAtIndex called with index:', insertIndex);
    if (simplifiedState.addRowAtIndex) {
      simplifiedState.addRowAtIndex(insertIndex);
    } else {
      console.log('⚠️ addRowAtIndex not available, using fallback addRow');
      simplifiedState.addRow();
    }
  };

  const addHeaderAtIndex = (insertIndex: number) => {
    console.log('🚀 StateCoordination addHeaderAtIndex called with index:', insertIndex);
    if (simplifiedState.addHeaderAtIndex) {
      simplifiedState.addHeaderAtIndex(insertIndex);
    } else {
      console.log('⚠️ addHeaderAtIndex not available, using fallback addHeader');
      simplifiedState.addHeader();
    }
  };

  // UI interactions that depend on the core state (NO showcaller interference)
  const interactions = useRundownGridInteractions(
    simplifiedState.items,
    (updater) => {
      if (typeof updater === 'function') {
        simplifiedState.setItems(updater(simplifiedState.items));
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
    addHeaderAtIndex
  );

  // Get UI state with enhanced navigation
  const uiState = useRundownUIState(
    simplifiedState.items,
    simplifiedState.visibleColumns,
    simplifiedState.updateItem,
    simplifiedState.setColumns,
    simplifiedState.columns
  );

  return {
    coreState: {
      // Core data (NO showcaller interference)
      items: simplifiedState.items,
      columns: simplifiedState.columns,
      visibleColumns: simplifiedState.visibleColumns,
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
      showcallerActivity: false, // No longer interferes with main state
      
      // Visual status overlay function (doesn't touch main state)
      getItemVisualStatus: showcallerVisual.getItemVisualStatus,
      
      // Selection state
      selectedRowId: simplifiedState.selectedRowId,
      handleRowSelection: simplifiedState.handleRowSelection,
      clearRowSelection: simplifiedState.clearRowSelection,
      
      // Calculations
      totalRuntime: simplifiedState.totalRuntime,
      getRowNumber: simplifiedState.getRowNumber,
      getHeaderDuration: simplifiedState.getHeaderDuration,
      calculateHeaderDuration: (index: number) => {
        const item = simplifiedState.items[index];
        return item ? simplifiedState.getHeaderDuration(item.id) : '00:00:00';
      },
      
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
      
      // Undo functionality
      undo: simplifiedState.undo,
      canUndo: simplifiedState.canUndo,
      lastAction: simplifiedState.lastAction,
      
      // Additional functionality
      calculateEndTime,
      markAsChanged: () => {
        // Handled internally by simplified state
      },
      addMultipleRows
    },
    interactions,
    uiState
  };
};
