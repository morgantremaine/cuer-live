
import React from 'react';
import RundownContent from './RundownContent';
import { useOptimizedRundownState } from '@/hooks/useOptimizedRundownState';
import { useRundownGridInteractions } from '@/hooks/useRundownGridInteractions';
import { useRundownUIState } from '@/hooks/useRundownUIState';

const RundownGrid = React.memo(() => {
  const state = useOptimizedRundownState();

  // Grid interactions
  const interactions = useRundownGridInteractions(
    state.items,
    (updater) => {
      if (typeof updater === 'function') {
        state.setItems(updater(state.items));
      } else {
        state.setItems(updater);
      }
    },
    state.updateItem,
    state.addRow,
    state.addHeader,
    state.deleteRow,
    state.toggleFloatRow,
    state.deleteMultipleItems,
    state.addMultipleRows,
    (columnId: string) => {
      const newColumns = state.columns.filter(col => col.id !== columnId);
      state.setColumns(newColumns);
    },
    state.calculateEndTime,
    (id: string, color: string) => {
      state.updateItem(id, 'color', color);
    },
    () => {}, // markAsChanged handled internally
    state.setTitle,
    state.addRow, // addRowAtIndex fallback
    state.addHeader // addHeaderAtIndex fallback
  );

  // UI state
  const uiState = useRundownUIState(
    state.items,
    state.visibleColumns,
    state.updateItem,
    state.setColumns,
    state.columns
  );

  const {
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    clearSelection,
    handleAddRow,
    handleAddHeader,
    handleRowSelection,
    hasClipboardData
  } = interactions;

  const { 
    showColorPicker, 
    handleToggleColorPicker, 
    selectColor,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown
  } = uiState;

  // Enhanced row selection
  const handleEnhancedRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    if (isShiftClick || isCtrlClick) {
      handleRowSelection(itemId, index, isShiftClick, isCtrlClick);
      if (state.selectedRowId !== null) {
        state.clearRowSelection();
      }
    } else {
      state.handleRowSelection(itemId);
      if (selectedRows.size > 0) {
        clearSelection();
      }
    }
  };

  // Enhanced jump to here handler
  const handleJumpToHere = (segmentId: string) => {
    if (state.isPlaying) {
      state.play(segmentId);
    } else {
      state.jumpToSegment(segmentId);
    }
    
    if (selectedRows.size > 0) {
      clearSelection();
    }
    if (state.selectedRowId !== null) {
      state.clearRowSelection();
    }
  };

  // Fix the getRowStatus function to match expected signature (item: RundownItem, currentTime: Date) => string
  const getRowStatus = (item: any, currentTime: Date): 'upcoming' | 'current' | 'completed' => {
    if (item.type === 'header') {
      return 'upcoming';
    }
    
    if (item.id === state.currentSegmentId) {
      return 'current';
    }
    
    return 'upcoming';
  };

  // Fix the getRowNumber function to match expected signature (index: number) => string
  const getRowNumber = (index: number): string => {
    return (index + 1).toString();
  };

  // Fix the calculateHeaderDuration function to match expected signature (index: number) => string
  const calculateHeaderDuration = (index: number): string => {
    return state.getHeaderDuration(index);
  };

  return (
    <RundownContent
      items={state.items}
      visibleColumns={state.visibleColumns}
      currentTime={state.currentTime}
      showColorPicker={showColorPicker}
      selectedRows={selectedRows}
      draggedItemIndex={draggedItemIndex}
      isDraggingMultiple={isDraggingMultiple}
      dropTargetIndex={dropTargetIndex}
      currentSegmentId={state.currentSegmentId}
      hasClipboardData={hasClipboardData()}
      selectedRowId={state.selectedRowId}
      getColumnWidth={getColumnWidth}
      updateColumnWidth={updateColumnWidth}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      calculateHeaderDuration={calculateHeaderDuration}
      onUpdateItem={state.updateItem}
      onCellClick={(itemId: string, field: string) => {
        const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
        handleCellClick(itemId, field, mockEvent);
      }}
      onKeyDown={(e: React.KeyboardEvent, itemId: string, field: string) => {
        const itemIndex = state.items.findIndex(item => item.id === itemId);
        handleKeyDown(e, itemId, field, itemIndex);
      }}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={selectColor}
      onDeleteRow={state.deleteRow}
      onToggleFloat={state.toggleFloatRow}
      onRowSelect={handleEnhancedRowSelection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onCopySelectedRows={handleCopySelectedRows}
      onDeleteSelectedRows={handleDeleteSelectedRows}
      onPasteRows={handlePasteRows}
      onClearSelection={() => {
        clearSelection();
        state.clearRowSelection();
      }}
      onAddRow={handleAddRow}
      onAddHeader={handleAddHeader}
      onJumpToHere={handleJumpToHere}
    />
  );
});

RundownGrid.displayName = 'RundownGrid';

export default RundownGrid;
