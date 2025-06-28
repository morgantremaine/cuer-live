
import React from 'react';
import RundownTable from './RundownTable';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useShowcallerStateCoordination } from '@/hooks/useShowcallerStateCoordination';
import { logger } from '@/utils/logger';

const RundownGrid = React.memo(() => {
  const {
    coreState,
    interactions,
    uiState
  } = useRundownStateCoordination();

  const {
    items,
    visibleColumns,
    currentTime,
    selectedRowId,
    handleRowSelection,
    clearRowSelection,
    rundownId,
    userId
  } = coreState;

  // Use coordinated showcaller state for better synchronization
  const {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    isInitialized,
    isConnected,
    getItemVisualStatus,
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment
  } = useShowcallerStateCoordination({
    items,
    rundownId,
    userId
  });

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
    selectColor,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown,
    cellRefs
  } = uiState;

  // Create wrapper for cell click to match signature
  const handleCellClickWrapper = (itemId: string, field: string) => {
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

  // Enhanced row status that uses showcaller visual state
  const getRowStatus = (item: any): 'upcoming' | 'current' | 'completed' => {
    if (item.type === 'header') {
      return 'upcoming'; // Headers don't have visual status
    }
    
    const visualStatus = getItemVisualStatus(item.id);
    if (visualStatus === 'current' || visualStatus === 'completed') {
      return visualStatus as 'current' | 'completed';
    }
    
    return 'upcoming';
  };

  // Enhanced row selection that properly handles both single and multi-selection
  const handleEnhancedRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    if (isShiftClick || isCtrlClick) {
      handleMultiRowSelection(itemId, index, isShiftClick, isCtrlClick);
      if (selectedRowId !== null) {
        clearRowSelection();
      }
    } else {
      handleRowSelection(itemId);
      if (selectedRows.size > 0) {
        clearSelection();
      }
    }
  };

  // Enhanced jump to here handler with better coordination
  const handleJumpToHere = (segmentId: string) => {
    logger.log('🎯 === COORDINATED JUMP TO HERE START ===');
    logger.log('🎯 Target segment ID:', segmentId);
    logger.log('🎯 Current segment ID:', currentSegmentId);
    logger.log('🎯 Is currently playing:', isPlaying);
    logger.log('🎯 Is controller:', isController);
    logger.log('🎯 Is initialized:', isInitialized);
    logger.log('🎯 Is connected:', isConnected);
    
    // Find the target segment
    const targetSegment = items.find(item => item.id === segmentId);
    if (!targetSegment) {
      logger.error('🎯 Target segment not found:', segmentId);
      return;
    }
    
    logger.log('🎯 Target segment found:', { 
      id: targetSegment.id, 
      name: targetSegment.name, 
      type: targetSegment.type 
    });
    
    // Use coordinated jump function
    if (isPlaying) {
      logger.log('🎯 Showcaller is playing - jumping and continuing playback');
      play(segmentId);
    } else {
      logger.log('🎯 Showcaller is paused - jumping but staying paused');
      jumpToSegment(segmentId);
    }
    
    // Clear selections
    if (selectedRows.size > 0) {
      clearSelection();
    }
    if (selectedRowId !== null) {
      clearRowSelection();
    }
    
    logger.log('🎯 === COORDINATED JUMP TO HERE END ===');
  };

  // Create wrapper functions for drag operations
  const handleDragStartWrapper = (e: React.DragEvent, index: number) => {
    handleDragStart(e, index);
  };

  const handleDragOverWrapper = (e: React.DragEvent, targetIndex?: number) => {
    handleDragOver(e, targetIndex);
  };

  const handleDragLeaveWrapper = (e: React.DragEvent) => {
    handleDragLeave(e);
  };

  const handleDropWrapper = (e: React.DragEvent, targetIndex: number) => {
    handleDrop(e, targetIndex);
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
      getRowNumber={coreState.getRowNumber}
      getRowStatus={getRowStatus}
      getHeaderDuration={coreState.calculateHeaderDuration}
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
});

RundownGrid.displayName = 'RundownGrid';

export default RundownGrid;
