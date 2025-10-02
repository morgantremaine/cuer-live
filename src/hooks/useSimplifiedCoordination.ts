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
      updateItemLocal: coordination.updateItem, // Same as updateItem in simplified system
      updateItemRaw: coordination.updateItem, // Same as updateItem in simplified system
      deleteRow: coordination.deleteRow,
      addRow: coordination.addRow,
      setTitle: coordination.setTitle,
      
      // Placeholder values for now
      columns: [],
      visibleColumns: [],
      currentTime: new Date(),
      timezone: 'UTC',
      rundownStartTime: '00:00:00',
      showDate: null as Date | null,
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
      jumpToSegment: (_segmentId: string) => {},
      
      // Undo/Redo (noop for now)
      undo: () => {},
      redo: () => {},
      canUndo: false,
      canRedo: false,
      lastAction: null,
      nextAction: null,
      
      // Column management (noop for now)
      addColumn: (_name: string) => {},
      updateColumnWidth: (_columnId: string, _width: string) => {},
      setColumns: (_columns: any[]) => {},
      
      // Other actions
      toggleFloatRow: (_id: string) => {},
      deleteMultipleItems: (_ids: string[]) => {},
      addItem: (_item: any) => {},
      setStartTime: (_time: string) => {},
      setTimezone: (_tz: string) => {},
      setShowDate: (_date: Date | null) => {},
      addHeader: () => {},
      addRowAtIndex: (_index: number, _item?: any) => {},
      addHeaderAtIndex: (_index: number, _item?: any) => {},
      calculateEndTime: (_startTime: string, _duration: string) => '',
      markAsChanged: () => {},
      addMultipleRows: (_items: any[]) => {},
      toggleAutoScroll: () => {},
      toggleHeaderCollapse: (_headerId: string) => {},
      isHeaderCollapsed: (_headerId: string) => false,
      getHeaderGroupItemIds: (_headerId: string) => [],
      visibleItems: coordination.items,
      markActiveTyping: (_itemId: string, _field: string) => {},
      moveItemUp: (_index: number) => {},
      moveItemDown: (_index: number) => {},
      getRowNumber: (_index: number) => '',
      getHeaderDuration: (_headerId: string) => '',
      calculateHeaderDuration: (_index: number) => '',
      getItemVisualStatus: (_item: any) => ({ status: 'pending' as const })
    },
    interactions: {
      // Placeholder interactions
      selectedRows: new Set<string>(),
      handleRowSelection,
      clearSelection: clearRowSelection,
      selectRow: (_rowId: string) => {},
      deselectRow: (_rowId: string) => {},
      toggleRowSelection: (_rowId: string) => {},
      selectMultipleRows: (_rowIds: string[]) => {},
      isRowSelected: (_rowId: string) => false,
      hasClipboardData: () => false,
      copySelectedRows: () => {},
      pasteRows: (_targetIndex?: number) => {},
      deleteSelectedRows: () => {},
      handleAddRow: (_selectedRowId: string | null, _count: number) => {},
      handleAddHeader: () => {},
      draggedItemIndex: null,
      isDraggingMultiple: false,
      dropTargetIndex: null,
      handleDragStart: (_e: React.DragEvent, _index: number) => {},
      handleDragOver: (_e: React.DragEvent, _targetIndex?: number) => {},
      handleDragLeave: (_e: React.DragEvent) => {},
      handleDrop: (_e: React.DragEvent, _targetIndex: number) => {},
      handleCopySelectedRows: () => {},
      handlePasteRows: (_targetIndex?: number) => {},
      handleDeleteSelectedRows: () => {}
    },
    uiState: {
      // Placeholder UI state
      showColumnManager,
      setShowColumnManager,
      showColorPicker: false,
      handleCellClick: (_itemId: string, _field: string, _e: React.MouseEvent) => {},
      handleKeyDown: (_e: React.KeyboardEvent, _itemId: string, _field: string, _itemIndex: number) => {},
      handleToggleColorPicker: (_itemId: string) => {},
      selectColor: (_itemId: string, _color: string) => {},
      getRowStatus: (_item: any) => 'upcoming' as 'upcoming' | 'current' | 'completed' | 'header',
      getColumnWidth: (_column: any) => '150px'
    },
    dragAndDrop: {
      // DnD Kit compatible structure
      DndContext: () => null,
      SortableContext: () => null,
      sensors: [],
      sortableItems: [],
      dndKitDragStart: (_event: any) => {},
      dndKitDragEnd: (_event: any) => {},
      modifiers: [],
      collisionDetection: null,
      activeId: null,
      resetDragState: () => {},
      draggedItemIndex: null,
      isDraggingMultiple: false,
      dropTargetIndex: null,
      handleDragStart: (_e: React.DragEvent, _index: number) => {},
      handleDragOver: (_e: React.DragEvent, _targetIndex?: number) => {},
      handleDragLeave: (_e: React.DragEvent) => {},
      handleDrop: (_e: React.DragEvent, _targetIndex: number) => {},
      handleDragEnd: () => {}
    }
  };
};

