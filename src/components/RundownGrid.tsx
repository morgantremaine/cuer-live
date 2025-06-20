
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

  // Enhanced jump to here handler with comprehensive debugging and direct showcaller state access
  const handleJumpToHere = (segmentId: string) => {
    console.log('🎯 === JUMP TO HERE DEBUG START ===');
    console.log('🎯 Target segment ID:', segmentId);
    console.log('🎯 Current segment ID before jump:', currentSegmentId);
    console.log('🎯 Is currently playing:', isPlaying);
    console.log('🎯 Time remaining:', timeRemaining);
    console.log('🎯 Available items:', items.map(item => ({ id: item.id, name: item.name, type: item.type })));
    
    // Find the target segment to ensure it exists
    const targetSegment = items.find(item => item.id === segmentId);
    console.log('🎯 Target segment found:', targetSegment ? { id: targetSegment.id, name: targetSegment.name, type: targetSegment.type } : 'NOT FOUND');
    
    if (targetSegment) {
      console.log('🎯 Calling play function with segment ID:', segmentId);
      console.log('🎯 Play function type:', typeof play);
      
      try {
        // Call the play function
        play(segmentId);
        console.log('🎯 Play function called successfully');
        
        // Check state immediately after call
        setTimeout(() => {
          console.log('🎯 State check 100ms after play call:');
          console.log('🎯 - Current segment ID:', currentSegmentId);
          console.log('🎯 - Is playing:', isPlaying);
          console.log('🎯 - Time remaining:', timeRemaining);
        }, 100);
        
        // Check state after a longer delay
        setTimeout(() => {
          console.log('🎯 State check 1000ms after play call:');
          console.log('🎯 - Current segment ID:', currentSegmentId);
          console.log('🎯 - Is playing:', isPlaying);
          console.log('🎯 - Time remaining:', timeRemaining);
        }, 1000);
        
      } catch (error) {
        console.error('🎯 Error calling play function:', error);
      }
    } else {
      console.error('🎯 Target segment not found for ID:', segmentId);
      console.log('🎯 Available segment IDs:', items.filter(item => item.type === 'regular').map(item => item.id));
    }
    
    console.log('🎯 === JUMP TO HERE DEBUG END ===');
  };

  return (
    <RundownTable
      items={items}
      visibleColumns={visibleColumns}
      currentTime={currentTime}
      showColorPicker={showColorPicker}
      cellRefs={cellRefs}
      selectedRows={selectedRows}
      draggedItemIndex={draggedItemIndex}
      isDraggingMultiple={isDraggingMultiple}
      dropTargetIndex={dropTargetIndex}
      currentSegmentId={currentSegmentId}
      hasClipboardData={hasClipboardData()}
      selectedRowId={selectedRowId}
      getColumnWidth={getColumnWidth}
      updateColumnWidth={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatusForTable}
      getHeaderDuration={calculateHeaderDuration}
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
      onDragLeave={handleDragLeaveWrapper}
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
      onJumpToHere={handleJumpToHere}
    />
  );
};

export default RundownGrid;
