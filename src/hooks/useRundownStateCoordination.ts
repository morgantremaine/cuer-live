
import { useMemo, useState } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIManager } from './useRundownUIManager';
import { getRowStatus, calculateEndTime, calculateTotalRuntime } from '@/utils/rundownCalculations';

export const useRundownStateCoordination = () => {
  // Add missing UI state
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Use the simplified state system
  const simplifiedState = useSimplifiedRundownState();
  
  console.log('🔄 State coordination - items:', simplifiedState.items.length, 'columns:', simplifiedState.visibleColumns.length);
  
  // Grid interactions
  const gridInteractions = useRundownGridInteractions(
    simplifiedState.items,
    (updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(simplifiedState.items);
        simplifiedState.setItems(newItems);
      }
    },
    simplifiedState.updateItem,
    simplifiedState.addRow,
    simplifiedState.addHeader,
    simplifiedState.deleteRow,
    simplifiedState.toggleFloat,
    simplifiedState.deleteMultipleItems,
    (items) => {
      items.forEach(item => simplifiedState.addItem(item));
    },
    (columnId) => {
      const newColumns = simplifiedState.columns.filter(col => col.id !== columnId);
      simplifiedState.setColumns(newColumns);
    },
    () => '00:00:00',
    (id, color) => simplifiedState.updateItem(id, 'color', color),
    () => {},
    simplifiedState.setTitle
  );
  
  // UI state management
  const uiManager = useRundownUIManager(
    simplifiedState.items,
    simplifiedState.visibleColumns,
    simplifiedState.columns,
    simplifiedState.updateItem,
    () => {}, // markAsChanged - no-op for now
    (columnId: string, width: number) => {
      simplifiedState.updateColumnWidth(columnId, `${width}px`);
    }
  );

  // Row status calculation wrapper
  const getRowStatusForItem = (item: any) => {
    return getRowStatus(item, simplifiedState.currentTime);
  };

  // Create enhanced core state with all necessary properties
  const coreState = useMemo(() => ({
    // Basic state
    items: simplifiedState.items,
    visibleColumns: simplifiedState.visibleColumns,
    currentTime: simplifiedState.currentTime,
    currentSegmentId: simplifiedState.currentSegmentId,
    rundownTitle: simplifiedState.rundownTitle,
    rundownStartTime: simplifiedState.rundownStartTime,
    timezone: simplifiedState.timezone,
    columns: simplifiedState.columns,
    rundownId: simplifiedState.rundownId,
    isLoading: simplifiedState.isLoading,
    hasUnsavedChanges: simplifiedState.hasUnsavedChanges,
    isSaving: simplifiedState.isSaving,
    
    // UI state
    showColumnManager,
    setShowColumnManager,
    
    // Core functions
    updateItem: simplifiedState.updateItem,
    deleteRow: simplifiedState.deleteRow,
    toggleFloatRow: simplifiedState.toggleFloat,
    setRundownTitle: simplifiedState.setTitle,
    getRowNumber: simplifiedState.getRowNumber,
    
    // Row operations - add these missing functions
    addRow: simplifiedState.addRow,
    addHeader: simplifiedState.addHeader,
    
    // Calculations
    calculateHeaderDuration: (index: number) => {
      const item = simplifiedState.items[index];
      return item ? simplifiedState.getHeaderDuration(item.id) : '00:00:00';
    },
    calculateTotalRuntime: () => simplifiedState.totalRuntime,
    calculateEndTime: (startTime: string, duration: string) => calculateEndTime(startTime, duration),
    
    // Playback controls (simplified)
    isPlaying: simplifiedState.isPlaying,
    timeRemaining: '00:00:00',
    play: () => {},
    pause: () => {},
    forward: () => {},
    backward: () => {},
    
    // Column management functions
    handleAddColumn: simplifiedState.addColumn,
    handleReorderColumns: (columns: any[]) => simplifiedState.setColumns(columns),
    handleDeleteColumn: (columnId: string) => {
      const newColumns = simplifiedState.columns.filter(col => col.id !== columnId);
      simplifiedState.setColumns(newColumns);
    },
    handleRenameColumn: (columnId: string, newName: string) => {
      const newColumns = simplifiedState.columns.map(col =>
        col.id === columnId ? { ...col, name: newName } : col
      );
      simplifiedState.setColumns(newColumns);
    },
    handleToggleColumnVisibility: (columnId: string) => {
      const newColumns = simplifiedState.columns.map(col =>
        col.id === columnId ? { ...col, isVisible: !col.isVisible } : col
      );
      simplifiedState.setColumns(newColumns);
    },
    handleLoadLayout: (columns: any[]) => simplifiedState.setColumns(columns),
    
    // Other missing functions
    markAsChanged: () => {},
    setRundownStartTime: simplifiedState.setStartTime,
    setTimezone: simplifiedState.setTimezone,
    
    // Simplified no-op functions for compatibility
    handleUndo: () => null,
    canUndo: false,
    lastAction: '',
    isConnected: false,
    isProcessingRealtimeUpdate: false
  }), [simplifiedState, showColumnManager]);

  return {
    coreState,
    interactions: gridInteractions,
    uiState: {
      ...uiManager,
      getRowStatus: getRowStatusForItem
    }
  };
};
