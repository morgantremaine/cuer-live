import { useMemo, useState } from 'react';
import { useSimplifiedRundownState } from './useSimplifiedRundownState';
import { useRundownGridInteractions } from './useRundownGridInteractions';
import { useRundownUIManager } from './useRundownUIManager';
import { getRowStatus } from '@/utils/rundownCalculations';
import { CalculatedRundownItem } from '@/utils/rundownCalculations';

export const useRundownStateCoordination = () => {
  // Add missing UI state
  const [showColumnManager, setShowColumnManager] = useState(false);
  
  // Use the simplified state system
  const simplifiedState = useSimplifiedRundownState();
  
  // Map items to CalculatedRundownItem format for grid interactions
  const calculatedItems = useMemo((): CalculatedRundownItem[] => {
    return simplifiedState.items.map(item => ({
      ...item,
      calculatedStartTime: item.startTime,
      calculatedEndTime: item.endTime,
      calculatedElapsedTime: item.elapsedTime,
      calculatedRowNumber: item.rowNumber
    }));
  }, [simplifiedState.items]);
  
  // Grid interactions - these functions need to properly handle both selection states
  const gridInteractions = useRundownGridInteractions(
    calculatedItems,
    (updater) => {
      if (typeof updater === 'function') {
        const newItems = updater(calculatedItems);
        // Map back to the original format - newItems are CalculatedRundownItem[]
        const mappedItems = newItems.map(item => {
          // Remove the calculated properties and keep the rest
          const { calculatedStartTime, calculatedEndTime, calculatedElapsedTime, calculatedRowNumber, ...baseItem } = item;
          return {
            ...baseItem,
            startTime: calculatedStartTime,
            endTime: calculatedEndTime,
            elapsedTime: calculatedElapsedTime,
            rowNumber: calculatedRowNumber
          };
        });
        simplifiedState.setItems(mappedItems);
      }
    },
    simplifiedState.updateItem,
    simplifiedState.addRow,
    simplifiedState.addHeader,
    simplifiedState.deleteItem,
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
  
  // UI state management with calculated items
  const uiManager = useRundownUIManager(
    calculatedItems,
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

  // Enhanced addRow that considers multi-selection when available
  const enhancedAddRow = () => {
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
  };

  // Enhanced addHeader that considers multi-selection when available
  const enhancedAddHeader = () => {
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
    
    // Row selection state
    selectedRowId: simplifiedState.selectedRowId,
    handleRowSelection: simplifiedState.handleRowSelection,
    clearRowSelection: simplifiedState.clearRowSelection,
    
    // UI state
    showColumnManager,
    setShowColumnManager,
    
    // Core functions
    updateItem: simplifiedState.updateItem,
    deleteRow: simplifiedState.deleteItem,
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
    calculateTotalRuntime: () => simplifiedState.totalRuntime(),
    calculateEndTime: (startTime: string, duration: string) => {
      // Simple end time calculation
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
    },
    
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
    
    // UNDO FUNCTIONALITY - Now properly connected!
    handleUndo: simplifiedState.handleUndo,
    canUndo: simplifiedState.canUndo,
    lastAction: simplifiedState.lastAction,
    
    // Simplified no-op functions for compatibility
    isConnected: false,
    isProcessingRealtimeUpdate: false
  }), [simplifiedState, showColumnManager, gridInteractions.selectedRows, enhancedAddRow, enhancedAddHeader]);

  return {
    coreState,
    interactions: gridInteractions,
    uiState: {
      ...uiManager,
      getRowStatus: getRowStatusForItem
    }
  };
};
