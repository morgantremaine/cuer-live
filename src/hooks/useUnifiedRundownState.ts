
import { useRundownGridState } from './useRundownGridState';
import { useIndexHandlers } from './useIndexHandlers';
import { UnifiedRundownState, RundownStateHandlers } from '@/types/rundownState';
import { useCallback, useMemo } from 'react';

export const useUnifiedRundownState = () => {
  const gridState = useRundownGridState();
  
  const {
    handleRundownStartTimeChange,
    handleTimezoneChange,
    handleOpenTeleprompter,
    handleRowSelect,
    handleAddRow,
    handleAddHeader
  } = useIndexHandlers({
    items: gridState.items,
    selectedRows: gridState.selectedRows,
    rundownId: gridState.rundownId,
    addRow: gridState.addRow,
    addHeader: gridState.addHeader,
    calculateEndTime: gridState.calculateEndTime,
    toggleRowSelection: gridState.toggleRowSelection,
    setRundownStartTime: gridState.setRundownStartTime,
    setTimezone: gridState.setTimezone,
    markAsChanged: gridState.markAsChanged
  });

  // Create unified state object with proper type conversions and defaults
  const state: UnifiedRundownState = useMemo(() => ({
    currentTime: gridState.currentTime,
    timezone: gridState.timezone,
    rundownTitle: gridState.rundownTitle,
    rundownStartTime: gridState.rundownStartTime,
    rundownId: gridState.rundownId || '',
    items: gridState.items,
    columns: gridState.columns,
    visibleColumns: gridState.visibleColumns,
    showColumnManager: gridState.showColumnManager,
    showColorPicker: Boolean(gridState.showColorPicker),
    selectedRows: gridState.selectedRows,
    currentSegmentId: gridState.currentSegmentId,
    draggedItemIndex: gridState.draggedItemIndex,
    isDraggingMultiple: gridState.isDraggingMultiple,
    dropTargetIndex: gridState.dropTargetIndex,
    hasClipboardData: typeof gridState.hasClipboardData === 'function' ? gridState.hasClipboardData() : Boolean(gridState.hasClipboardData),
    isPlaying: gridState.isPlaying,
    timeRemaining: typeof gridState.timeRemaining === 'string' ? parseFloat(gridState.timeRemaining) || 0 : (gridState.timeRemaining || 0),
    hasUnsavedChanges: gridState.hasUnsavedChanges,
    isSaving: gridState.isSaving,
    canUndo: gridState.canUndo,
    lastAction: gridState.lastAction || '',
    hasRemoteUpdates: gridState.hasRemoteUpdates || false, // Add default value
    cellRefs: gridState.cellRefs
  }), [gridState]);

  // Create unified handlers object with proper function signatures and defaults
  const handlers: RundownStateHandlers = useMemo(() => ({
    onTimezoneChange: handleTimezoneChange,
    onTitleChange: gridState.setRundownTitle,
    onRundownStartTimeChange: handleRundownStartTimeChange,
    setShowColumnManager: gridState.setShowColumnManager,
    onUpdateItem: gridState.updateItem,
    onAddRow: handleAddRow,
    onAddHeader: handleAddHeader,
    onDeleteRow: gridState.deleteRow,
    onToggleFloat: gridState.toggleFloatRow,
    onRowSelect: handleRowSelect, // This now matches the correct signature
    onClearSelection: gridState.clearSelection,
    onCopySelectedRows: gridState.handleCopySelectedRows,
    onPasteRows: gridState.handlePasteRows,
    onDeleteSelectedRows: gridState.handleDeleteSelectedRows,
    onCellClick: gridState.handleCellClick,
    onKeyDown: useCallback((event: React.KeyboardEvent) => {
      const target = event.target as HTMLElement;
      const itemId = target.getAttribute('data-item-id') || '';
      const field = target.getAttribute('data-field') || '';
      gridState.handleKeyDown(event, itemId, field);
    }, [gridState.handleKeyDown]),
    onToggleColorPicker: gridState.handleToggleColorPicker,
    onColorSelect: gridState.selectColor,
    onDragStart: useCallback((index: number) => {
      const event = {} as React.DragEvent;
      gridState.handleDragStart(event, index);
    }, [gridState.handleDragStart]),
    onDragOver: useCallback((index: number) => {
      const event = {} as React.DragEvent;
      gridState.handleDragOver(event, index);
    }, [gridState.handleDragOver]),
    onDragLeave: useCallback(() => {
      const event = {} as React.DragEvent;
      gridState.handleDragLeave(event);
    }, [gridState.handleDragLeave]),
    onDrop: useCallback((targetIndex: number) => {
      const event = {} as React.DragEvent;
      gridState.handleDrop(event, targetIndex);
    }, [gridState.handleDrop]),
    handleAddColumn: gridState.handleAddColumn,
    handleReorderColumns: useCallback((startIndex: number, endIndex: number) => {
      const newColumns = [...gridState.columns];
      const [removed] = newColumns.splice(startIndex, 1);
      newColumns.splice(endIndex, 0, removed);
      gridState.handleLoadLayout(newColumns);
    }, [gridState.columns, gridState.handleLoadLayout]),
    handleDeleteColumn: gridState.handleDeleteColumn,
    handleRenameColumn: gridState.handleRenameColumn,
    handleToggleColumnVisibility: gridState.handleToggleColumnVisibility,
    handleLoadLayout: gridState.handleLoadLayout,
    onPlay: gridState.play,
    onPause: gridState.pause,
    onForward: gridState.forward,
    onBackward: gridState.backward,
    onOpenTeleprompter: handleOpenTeleprompter,
    onUndo: gridState.handleUndo,
    clearRemoteUpdatesIndicator: gridState.clearRemoteUpdatesIndicator || (() => {}), // Add default function
    getColumnWidth: useCallback((columnId: string): number => {
      const column = gridState.columns.find(col => col.id === columnId);
      if (column) {
        const width = gridState.getColumnWidth(column);
        if (typeof width === 'string') {
          return parseInt(width.replace('px', '')) || 150;
        }
        return width;
      }
      return 150;
    }, [gridState.columns, gridState.getColumnWidth]),
    updateColumnWidth: gridState.updateColumnWidth,
    getRowNumber: gridState.getRowNumber,
    getRowStatus: useCallback((item: any) => {
      const status = gridState.getRowStatus(item);
      return status === 'completed' ? 'past' : status;
    }, [gridState.getRowStatus]),
    calculateHeaderDuration: gridState.calculateHeaderDuration,
    calculateTotalRuntime: gridState.calculateTotalRuntime
  }), [
    gridState, 
    handleTimezoneChange, 
    handleRundownStartTimeChange, 
    handleOpenTeleprompter, 
    handleRowSelect, 
    handleAddRow, 
    handleAddHeader
  ]);

  return { state, handlers };
};
