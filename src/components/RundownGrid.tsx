
import React from 'react';
import RundownTable from './RundownTable';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';

const RundownGrid = () => {
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
    // Showcaller controls - ensure these are properly passed through
    play,
    pause,
    forward,
    backward,
    isPlaying,
    timeRemaining
  } = coreState;

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
    handleRowSelection: handleMultiRowSelection,
    hasClipboardData
  } = interactions;

  const { 
    showColorPicker, 
    handleToggleColorPicker, 
    getRowStatus, 
    selectColor,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown,
    cellRefs
  } = uiState;

  // Create wrapper for cell click to match signature
  const handleCellClickWrapper = (itemId: string, field: string) => {
    // Create a mock event since the original expects an event parameter
    const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
    handleCellClick(itemId, field, mockEvent);
  };

  // Create wrapper for key down to match signature
  const handleKeyDownWrapper = (e: React.KeyboardEvent, itemId: string, field: string) => {
    const itemIndex = items.findIndex(item => item.id === itemId);
    handleKeyDown(e, itemId, field, itemIndex);
  };

  // Create a wrapper function that matches the expected signature
  const handleColorSelect = (id: string, color: string) => {
    selectColor(id, color);
  };

  // Create wrapper for getRowStatus that filters out "header" for components that don't expect it
  const getRowStatusForTable = (item: any): 'upcoming' | 'current' | 'completed' => {
    const status = getRowStatus(item);
    if (status === 'header') {
      return 'upcoming'; // Default fallback for headers
    }
    return status;
  };

  // Create a wrapper function to convert headerId to index for header duration calculation
  const getHeaderDurationById = (headerId: string): string => {
    const itemIndex = items.findIndex(item => item.id === headerId);
    if (itemIndex === -1) return '00:00:00';
    return calculateHeaderDuration(itemIndex);
  };

  // Enhanced row selection that properly handles both single and multi-selection
  const handleEnhancedRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    if (isShiftClick || isCtrlClick) {
      // Multi-selection mode
      handleMultiRowSelection(itemId, index, isShiftClick, isCtrlClick);
      // Clear single selection when doing multi-selection
      if (selectedRowId !== null) {
        clearRowSelection();
      }
    } else {
      // Single selection mode
      handleRowSelection(itemId);
      // Clear multi-selection when doing single selection
      if (selectedRows.size > 0) {
        clearSelection();
      }
    }
  };

  // Create wrapper functions that match the expected signatures
  const handleDragStartWrapper = (e: React.DragEvent, index: number) => {
    interactions.handleDragStart(e, index);
  };

  const handleDragOverWrapper = (e: React.DragEvent, targetIndex?: number) => {
    interactions.handleDragOver(e, targetIndex);
  };

  const handleDragLeaveWrapper = (e: React.DragEvent) => {
    interactions.handleDragLeave(e);
  };

  const handleDropWrapper = (e: React.DragEvent, targetIndex: number) => {
    interactions.handleDrop(e, targetIndex);
  };

  return (
    <RundownTable
      items={items}
      columns={visibleColumns}
      showColorPicker={showColorPicker}
      cellRefs={cellRefs}
      selectedRows={selectedRows}
      currentlyPlayingId={currentSegmentId}
      isDraggingMultiple={isDraggingMultiple}
      hasClipboardData={hasClipboardData()}
      getColumnWidth={getColumnWidth}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatusForTable}
      getHeaderDuration={getHeaderDurationById}
      onUpdateItem={coreState.updateItem}
      onCellClick={handleCellClickWrapper}
      onKeyDown={handleKeyDownWrapper}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={handleColorSelect}
      onDeleteRow={coreState.deleteRow}
      onToggleFloat={coreState.toggleFloatRow}
      onRowSelect={handleEnhancedRowSelection}
      onDragStart={handleDragStartWrapper}
      onDragOver={handleDragOverWrapper}
      onDrop={handleDropWrapper}
      onCopySelectedRows={handleCopySelectedRows}
      onDeleteSelectedRows={handleDeleteSelectedRows}
      onPasteRows={handlePasteRows}
      onClearSelection={() => {
        clearSelection();
        clearRowSelection();
      }}
      onAddRow={handleAddRow}
      onAddHeader={handleAddHeader}
      isDragging={draggedItemIndex !== null}
    />
  );
};

export default RundownGrid;
