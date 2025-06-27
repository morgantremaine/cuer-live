
import React from 'react';
import { useParams } from 'react-router-dom';
import RundownContainer from '@/components/RundownContainer';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useFindReplace } from '@/hooks/useFindReplace';

const Index = () => {
  const { id } = useParams();
  
  // Use the main state coordination hook to get all the rundown state and functionality
  const {
    coreState,
    interactions,
    uiState
  } = useRundownStateCoordination();

  const {
    items,
    visibleColumns,
    currentTime,
    currentSegmentId,
    getRowNumber,
    calculateHeaderDuration,
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    play,
    pause,
    forward,
    backward,
    isPlaying,
    timeRemaining,
    updateItem
  } = coreState;

  // Initialize find/replace functionality with correct parameters
  const findReplace = useFindReplace({
    items,
    onUpdateItem: (itemId: string, field: string, value: string) => {
      updateItem(itemId, field, value);
    },
    onJumpToItem: (itemId: string) => {
      // Scroll to the item
      const element = document.querySelector(`[data-item-id="${itemId}"]`);
      if (element) {
        element.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  });

  // Create wrapper for getRowStatus to match expected return type
  const getRowStatusForContainer = (item: any): 'upcoming' | 'current' | 'completed' => {
    const status = uiState.getRowStatus(item);
    if (status === 'header') {
      return 'upcoming'; // Default fallback for headers
    }
    return status;
  };

  // Create the props object for RundownContainer
  const containerProps = {
    currentTime: coreState.currentTime,
    timezone: coreState.timezone,
    onTimezoneChange: coreState.setTimezone,
    totalRuntime: coreState.totalRuntime,
    showColumnManager: uiState.showColumnManager || false,
    setShowColumnManager: uiState.setShowColumnManager || (() => {}),
    items: coreState.items,
    visibleColumns: coreState.visibleColumns,
    columns: coreState.columns,
    showColorPicker: uiState.showColorPicker,
    cellRefs: uiState.cellRefs,
    selectedRows: interactions.selectedRows,
    draggedItemIndex: interactions.draggedItemIndex,
    isDraggingMultiple: interactions.isDraggingMultiple,
    dropTargetIndex: interactions.dropTargetIndex,
    currentSegmentId: coreState.currentSegmentId,
    getColumnWidth: uiState.getColumnWidth,
    updateColumnWidth: uiState.updateColumnWidth,
    getRowNumber: coreState.getRowNumber,
    getRowStatus: getRowStatusForContainer,
    calculateHeaderDuration: coreState.calculateHeaderDuration,
    onUpdateItem: coreState.updateItem,
    onCellClick: uiState.handleCellClick,
    onKeyDown: uiState.handleKeyDown,
    onToggleColorPicker: uiState.handleToggleColorPicker,
    onColorSelect: uiState.selectColor,
    onDeleteRow: interactions.handleDeleteRow,
    onToggleFloat: interactions.handleToggleFloat,
    onRowSelect: interactions.handleRowSelection,
    onDragStart: interactions.handleDragStart,
    onDragOver: interactions.handleDragOver,
    onDragLeave: interactions.handleDragLeave,
    onDrop: interactions.handleDrop,
    onAddRow: interactions.handleAddRow,
    onAddHeader: interactions.handleAddHeader,
    selectedCount: interactions.selectedRows.size,
    hasClipboardData: interactions.hasClipboardData(),
    onCopySelectedRows: interactions.handleCopySelectedRows,
    onPasteRows: interactions.handlePasteRows,
    onDeleteSelectedRows: interactions.handleDeleteSelectedRows,
    onClearSelection: interactions.clearSelection,
    selectedRowId: coreState.selectedRowId,
    isPlaying: coreState.isPlaying,
    timeRemaining: coreState.timeRemaining,
    onPlay: coreState.play,
    onPause: coreState.pause,
    onForward: coreState.forward,
    onBackward: coreState.backward,
    onReset: coreState.reset,
    handleAddColumn: coreState.addColumn,
    handleReorderColumns: coreState.setColumns,
    handleDeleteColumnWithCleanup: (columnId: string) => {
      const newColumns = coreState.columns.filter(col => col.id !== columnId);
      coreState.setColumns(newColumns);
    },
    handleRenameColumn: (columnId: string, newName: string) => {
      const updatedColumns = coreState.columns.map(col => 
        col.id === columnId ? { ...col, name: newName } : col
      );
      coreState.setColumns(updatedColumns);
    },
    handleToggleColumnVisibility: (columnId: string) => {
      const updatedColumns = coreState.columns.map(col => 
        col.id === columnId ? { ...col, visible: !col.visible } : col
      );
      coreState.setColumns(updatedColumns);
    },
    handleLoadLayout: coreState.setColumns,
    hasUnsavedChanges: coreState.hasUnsavedChanges,
    isSaving: coreState.isSaving,
    rundownTitle: coreState.rundownTitle,
    onTitleChange: coreState.setTitle,
    rundownStartTime: coreState.rundownStartTime,
    onRundownStartTimeChange: coreState.setStartTime,
    rundownId: id,
    onOpenTeleprompter: () => {
      const teleprompterUrl = `/teleprompter/${id}`;
      window.open(teleprompterUrl, '_blank');
    },
    onUndo: coreState.undo,
    canUndo: coreState.canUndo,
    lastAction: coreState.lastAction,
    isConnected: coreState.isConnected,
    isProcessingRealtimeUpdate: coreState.isProcessingRealtimeUpdate,
    onJumpToHere: coreState.jumpToSegment,
    autoScrollEnabled: coreState.autoScrollEnabled,
    onToggleAutoScroll: coreState.toggleAutoScroll,
    // Add find/replace state to be passed through to components
    searchTerm: findReplace.searchTerm,
    caseSensitive: findReplace.caseSensitive,
    currentMatchIndex: findReplace.currentMatchIndex,
    matchCount: findReplace.matchCount,
    matches: findReplace.matches,
    findReplaceActions: {
      setSearchTerm: findReplace.setSearchTerm,
      setReplaceTerm: findReplace.setReplaceTerm,
      setCaseSensitive: findReplace.setCaseSensitive,
      nextMatch: findReplace.nextMatch,
      previousMatch: findReplace.previousMatch,
      replaceCurrent: findReplace.replaceCurrent,
      replaceAll: findReplace.replaceAll,
      reset: findReplace.reset,
      replaceTerm: findReplace.replaceTerm
    }
  };

  return <RundownContainer {...containerProps} />;
};

export default Index;
