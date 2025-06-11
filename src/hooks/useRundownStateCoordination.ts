import { useMemo, useState, useCallback } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIManager } from './useRundownUIManager';
import { getRowStatus, calculateEndTime, calculateTotalRuntime } from '@/utils/rundownCalculations';

export const useRundownStateCoordination = () => {
  // Add missing UI state
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Use the simplified state system
  const simplifiedState = useSimplifiedRundownState();
  
  // Grid interactions - these functions need to properly handle both selection states
  const gridInteractions = useRundownGridInteractions(
    simplifiedState.items,
    (updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(simplifiedState.items);
        simplifiedState.setItems(newItems);
      }
    },
    simplifiedState.updateItem,
    // Enhanced addRow that gets access to multi-selection state
    () => {
      // This will be enhanced by the handlers to consider multi-selection
      simplifiedState.addRow();
    },
    // Enhanced addHeader that gets access to multi-selection state
    () => {
      // This will be enhanced by the handlers to consider multi-selection
      simplifiedState.addHeader();
    },
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
  const getRowStatusForItem = useCallback((item: any) => {
    return getRowStatus(item, simplifiedState.currentTime);
  }, [simplifiedState.currentTime]);

  // Enhanced addRow that considers multi-selection when available - memoized
  const enhancedAddRow = useCallback(() => {
    if (gridInteractions.selectedRows.size > 0) {
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(gridInteractions.selectedRows)
        .map(id => simplifiedState.items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        simplifiedState.addRowAtIndex(insertAfterIndex + 1);
        return;
      }
    }
    
    // Check single selection
    if (simplifiedState.selectedRowId) {
      const selectedIndex = simplifiedState.items.findIndex(item => item.id === simplifiedState.selectedRowId);
      if (selectedIndex !== -1) {
        simplifiedState.addRowAtIndex(selectedIndex + 1);
        return;
      }
    }
    
    simplifiedState.addRow();
  }, [gridInteractions.selectedRows, simplifiedState.selectedRowId, simplifiedState.items, simplifiedState.addRowAtIndex, simplifiedState.addRow]);

  // Enhanced addHeader that considers multi-selection when available - memoized
  const enhancedAddHeader = useCallback(() => {
    if (gridInteractions.selectedRows.size > 0) {
      // Find the highest index among selected rows and insert after it
      const selectedIndices = Array.from(gridInteractions.selectedRows)
        .map(id => simplifiedState.items.findIndex(item => item.id === id))
        .filter(index => index !== -1);
      
      if (selectedIndices.length > 0) {
        const insertAfterIndex = Math.max(...selectedIndices);
        simplifiedState.addHeaderAtIndex(insertAfterIndex + 1);
        return;
      }
    }
    
    // Check single selection
    if (simplifiedState.selectedRowId) {
      const selectedIndex = simplifiedState.items.findIndex(item => item.id === simplifiedState.selectedRowId);
      if (selectedIndex !== -1) {
        simplifiedState.addHeaderAtIndex(selectedIndex + 1);
        return;
      }
    }
    
    simplifiedState.addHeader();
  }, [gridInteractions.selectedRows, simplifiedState.selectedRowId, simplifiedState.items, simplifiedState.addHeaderAtIndex, simplifiedState.addHeader]);

  // Create enhanced core state with stable dependencies
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
    
    // Row selection state
    selectedRowId: simplifiedState.selectedRowId,
    handleRowSelection: simplifiedState.handleRowSelection,
    clearRowSelection: simplifiedState.clearRowSelection,
    
    // UI state
    showColumnManager,
    setShowColumnManager,
    
    // Core functions
    updateItem: simplifiedState.updateItem,
    deleteRow: simplifiedState.deleteRow,
    toggleFloatRow: simplifiedState.toggleFloat,
    setRundownTitle: simplifiedState.setTitle,
    getRowNumber: simplifiedState.getRowNumber,
    
    // Enhanced row operations that consider both selection states
    addRow: enhancedAddRow,
    addHeader: enhancedAddHeader,
    
    // Calculations
    calculateHeaderDuration: (index: number) => {
      const item = simplifiedState.items[index];
      return item ? simplifiedState.getHeaderDuration(item.id) : '00:00:00';
    },
    calculateTotalRuntime: () => simplifiedState.totalRuntime,
    calculateEndTime: (startTime: string, duration: string) => calculateEndTime(startTime, duration),
    
    // Showcaller controls - properly expose these with working functions
    isPlaying: simplifiedState.isPlaying,
    timeRemaining: simplifiedState.timeRemaining,
    play: simplifiedState.play,
    pause: simplifiedState.pause,
    forward: simplifiedState.forward,
    backward: simplifiedState.backward,
    isController: simplifiedState.isController,
    
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
    
    // Properly expose undo functionality from simplified state
    handleUndo: simplifiedState.undo,
    canUndo: simplifiedState.canUndo,
    lastAction: simplifiedState.lastAction || '',
    
    // NEW: Realtime connection status from simplified state
    isConnected: simplifiedState.isConnected,
    isProcessingRealtimeUpdate: simplifiedState.isProcessingRealtimeUpdate
  }), [
    simplifiedState.items,
    simplifiedState.visibleColumns,
    simplifiedState.currentTime,
    simplifiedState.currentSegmentId,
    simplifiedState.rundownTitle,
    simplifiedState.rundownStartTime,
    simplifiedState.timezone,
    simplifiedState.columns,
    simplifiedState.rundownId,
    simplifiedState.isLoading,
    simplifiedState.hasUnsavedChanges,
    simplifiedState.isSaving,
    simplifiedState.selectedRowId,
    simplifiedState.handleRowSelection,
    simplifiedState.clearRowSelection,
    showColumnManager,
    setShowColumnManager,
    simplifiedState.updateItem,
    simplifiedState.deleteRow,
    simplifiedState.toggleFloat,
    simplifiedState.setTitle,
    simplifiedState.getRowNumber,
    enhancedAddRow,
    enhancedAddHeader,
    simplifiedState.totalRuntime,
    simplifiedState.isPlaying,
    simplifiedState.timeRemaining,
    simplifiedState.play,
    simplifiedState.pause,
    simplifiedState.forward,
    simplifiedState.backward,
    simplifiedState.isController,
    simplifiedState.addColumn,
    simplifiedState.setColumns,
    simplifiedState.setStartTime,
    simplifiedState.setTimezone,
    simplifiedState.undo,
    simplifiedState.canUndo,
    simplifiedState.lastAction,
    simplifiedState.isConnected,
    simplifiedState.isProcessingRealtimeUpdate
  ]);

  return {
    coreState,
    interactions: gridInteractions,
    uiState: {
      ...uiManager,
      getRowStatus: getRowStatusForItem
    }
  };
};
