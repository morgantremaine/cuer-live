import { useSimplifiedRundownCoordination } from './useSimplifiedRundownCoordination';
import { useAuth } from './useAuth';
import { useState, useCallback } from 'react';

export const useSimplifiedCoordination = (rundownId: string) => {
  const { user } = useAuth();
  const userId = user?.id || '';

  const coordination = useSimplifiedRundownCoordination({ rundownId });

  // Additional UI state
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showColumnManager, setShowColumnManager] = useState(false);

  // Selection handlers
  const handleRowSelection = useCallback((rowId: string | null) => {
    setSelectedRowId(rowId);
  }, []);

  const clearRowSelection = useCallback(() => {
    setSelectedRowId(null);
  }, []);

  // Return unified interface matching the expected format
  return {
    coreState: {
      // Data
      items: coordination.items,
      rundownTitle: coordination.title,
      isLoading: coordination.isLoading,
      rundownId,
      
      // Save state for indicators
      isSaving: coordination.saveState.isSaving,
      hasUnsavedChanges: coordination.saveState.hasUnsavedChanges,
      isConnected: true,
      
      // Selection
      selectedRowId,
      handleRowSelection,
      clearRowSelection,
      
      // Actions
      updateItem: coordination.updateItem,
      deleteRow: coordination.deleteRow,
      addRow: (index: number, item: any) => coordination.addRow(index, item),
      setTitle: coordination.setTitle,
      
      // Placeholder values for now
      columns: [],
      visibleColumns: [],
      currentTime: new Date().toISOString(),
      timezone: 'UTC',
      rundownStartTime: '00:00:00',
      showDate: null,
      currentSegmentId: null,
      isPlaying: false,
      timeRemaining: 0,
      isController: false,
      isInitialized: true,
      hasLoadedInitialState: true,
      showcallerActivity: false,
      isProcessingRealtimeUpdate: false,
      totalRuntime: '00:00:00',
      autoScrollEnabled: false,
      
      // Showcaller controls (noop for now)
      play: () => {},
      pause: () => {},
      forward: () => {},
      backward: () => {},
      reset: () => {},
      jumpToSegment: () => {},
      
      // Undo/Redo (noop for now)
      undo: () => {},
      redo: () => {},
      canUndo: false,
      canRedo: false,
      lastAction: null,
      nextAction: null,
      
      // Column management (noop for now)
      addColumn: () => {},
      updateColumnWidth: () => {},
      setColumns: () => {},
      
      // Other actions
      toggleFloatRow: () => {},
      deleteMultipleItems: () => {},
      addItem: () => {},
      setStartTime: () => {},
      setTimezone: () => {},
      setShowDate: () => {},
      addHeader: () => {},
      addRowAtIndex: () => {},
      addHeaderAtIndex: () => {},
      calculateEndTime: () => '',
      markAsChanged: () => {},
      addMultipleRows: () => {},
      toggleAutoScroll: () => {},
      toggleHeaderCollapse: () => {},
      isHeaderCollapsed: () => false,
      getHeaderGroupItemIds: () => [],
      visibleItems: coordination.items,
      markActiveTyping: () => {},
      moveItemUp: () => {},
      moveItemDown: () => {},
      getRowNumber: () => '',
      getHeaderDuration: () => '',
      calculateHeaderDuration: () => '',
      getItemVisualStatus: () => ({ status: 'pending' as const })
    },
    interactions: {
      // Placeholder interactions
      selectedRows: new Set<string>(),
      handleRowSelection,
      clearSelection: clearRowSelection,
      selectRow: () => {},
      deselectRow: () => {},
      toggleRowSelection: () => {},
      selectMultipleRows: () => {},
      isRowSelected: () => false,
      hasClipboardData: () => false,
      copySelectedRows: () => {},
      pasteRows: () => {},
      deleteSelectedRows: () => {}
    },
    uiState: {
      // Placeholder UI state
      showColumnManager,
      setShowColumnManager
    },
    dragAndDrop: {
      // Placeholder drag and drop
      draggedItemIndex: null,
      isDraggingMultiple: false,
      dropTargetIndex: null,
      handleDragStart: () => {},
      handleDragOver: () => {},
      handleDragLeave: () => {},
      handleDrop: () => {},
      handleDragEnd: () => {},
      resetDragState: () => {}
    }
  };
};

