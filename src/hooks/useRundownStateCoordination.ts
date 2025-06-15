
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIState } from './useRundownUIState';
import { UnifiedRundownState } from '@/types/interfaces';

export const useRundownStateCoordination = (): UnifiedRundownState => {
  // Single source of truth for all rundown state
  const simplifiedState = useSimplifiedRundownState();

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
    // Convert to proper RundownItem format and add them
    const itemsToAdd = newItems.map(item => ({
      ...item,
      id: item.id || `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      endTime: item.endTime || calcEndTime(item.startTime || '00:00:00', item.duration || '00:00')
    }));
    
    // Use setItems with updater function
    simplifiedState.setItems(itemsToAdd);
  };

  // UI interactions that depend on the core state
  const interactions = useRundownGridInteractions(
    simplifiedState.items,
    (updater) => {
      // Handle both direct items and updater functions
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
      // Handle delete column - remove from columns
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
    simplifiedState.setTitle
  );

  // UI state management
  const uiState = useRundownUIState(
    simplifiedState.items,
    simplifiedState.visibleColumns,
    simplifiedState.updateItem,
    simplifiedState.setColumns,
    simplifiedState.columns
  );

  return {
    coreState: {
      // Core data
      items: simplifiedState.items,
      columns: simplifiedState.columns,
      visibleColumns: simplifiedState.visibleColumns,
      rundownTitle: simplifiedState.rundownTitle,
      rundownStartTime: simplifiedState.rundownStartTime,
      timezone: simplifiedState.timezone,
      currentTime: simplifiedState.currentTime,
      rundownId: simplifiedState.rundownId,
      
      // State flags
      isLoading: simplifiedState.isLoading,
      hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
      isSaving: simplifiedState.isSaving,
      isConnected: simplifiedState.isConnected,
      isProcessingRealtimeUpdate: simplifiedState.isProcessingRealtimeUpdate,
      
      // Playback state
      currentSegmentId: simplifiedState.currentSegmentId,
      isPlaying: simplifiedState.isPlaying,
      timeRemaining: simplifiedState.timeRemaining,
      isController: simplifiedState.isController,
      showcallerActivity: simplifiedState.showcallerActivity,
      
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
      
      // Core actions
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
      addRowAtIndex: simplifiedState.addRowAtIndex,
      addHeaderAtIndex: simplifiedState.addHeaderAtIndex,
      
      // Column management
      addColumn: simplifiedState.addColumn,
      updateColumnWidth: simplifiedState.updateColumnWidth,
      setColumns: simplifiedState.setColumns,
      
      // Playback controls
      play: simplifiedState.play,
      pause: simplifiedState.pause,
      forward: simplifiedState.forward,
      backward: simplifiedState.backward,
      
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
