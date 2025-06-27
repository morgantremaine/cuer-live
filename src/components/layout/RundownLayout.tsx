
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import RundownContent from '../RundownContent';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { logger } from '@/utils/logger';

interface RundownLayoutProps {
  rundownId?: string;
  searchTerm?: string;
  caseSensitive?: boolean;
  currentMatchIndex?: number;
  matchCount?: number;
  matches?: any[];
}

const RundownLayout = ({
  rundownId,
  searchTerm = '',
  caseSensitive = false,
  currentMatchIndex = 0,
  matchCount = 0,
  matches = []
}: RundownLayoutProps) => {
  // Use the state coordination hook to manage core state, interactions, and UI state
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

  // Fixed jump to here handler that properly checks playing state
  const handleJumpToHere = (segmentId: string) => {
    logger.log('🎯 === JUMP TO HERE DEBUG START (RundownLayout FIXED VERSION) ===');
    logger.log('🎯 Target segment ID:', segmentId);
    logger.log('🎯 Current segment ID before jump:', currentSegmentId);
    logger.log('🎯 Is currently playing:', isPlaying);
    logger.log('🎯 Time remaining:', timeRemaining);
    
    // Find the target segment to ensure it exists
    const targetSegment = items.find(item => item.id === segmentId);
    logger.log('🎯 Target segment found:', targetSegment ? { id: targetSegment.id, name: targetSegment.name, type: targetSegment.type } : 'NOT FOUND');
    
    if (!targetSegment) {
      logger.error('🎯 Target segment not found for ID:', segmentId);
      return;
    }
    
    // Update item statuses for visual feedback regardless of playing state
    const selectedIndex = items.findIndex(item => item.id === segmentId);
    items.forEach((item, index) => {
      if (item.type === 'regular') {
        if (index < selectedIndex) {
          // Mark previous items as completed
          coreState.updateItem(item.id, 'status', 'completed');
        } else if (index === selectedIndex) {
          // Mark target item as current
          coreState.updateItem(item.id, 'status', 'current');
        } else {
          // Mark future items as upcoming
          coreState.updateItem(item.id, 'status', 'upcoming');
        }
      }
    });
    
    // CRITICAL FIX: Only start playback if the showcaller is already playing
    if (isPlaying) {
      logger.log('🎯 RundownLayout: Showcaller is playing - jumping and continuing playback');
      play(segmentId);
    } else {
      logger.log('🎯 RundownLayout: Showcaller is paused - jumping but staying paused');
    }
    
    logger.log('🎯 === JUMP TO HERE DEBUG END (RundownLayout FIXED VERSION) ===');
  };

  // State and handlers for autoscroll toggle
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const handleToggleAutoScroll = () => {
    setAutoScrollEnabled(prev => !prev);
  };

  // Clear selection handler
  const handleClearSelection = () => {
    clearSelection();
    clearRowSelection();
  };

  // Dummy handlers for missing functions
  const handleDeleteRow = (id: string) => {
    // This should be connected to the actual delete functionality
    console.log('Delete row:', id);
  };

  const handleToggleFloat = (id: string) => {
    // This should be connected to the actual toggle float functionality
    console.log('Toggle float:', id);
  };

  const handleAddRow = () => {
    // This should be connected to the actual add row functionality
    console.log('Add row');
  };

  const handleAddHeader = () => {
    // This should be connected to the actual add header functionality
    console.log('Add header');
  };

  return (
    <div className="h-full flex flex-col">
      <RundownContent
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
        isPlaying={isPlaying}
        autoScrollEnabled={autoScrollEnabled}
        onToggleAutoScroll={handleToggleAutoScroll}
        searchTerm={searchTerm}
        caseSensitive={caseSensitive}
        currentMatchIndex={currentMatchIndex}
        matchCount={matchCount}
        matches={matches}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatusForTable}
        calculateHeaderDuration={calculateHeaderDuration}
        onUpdateItem={updateItem}
        onCellClick={handleCellClickWrapper}
        onKeyDown={handleKeyDownWrapper}
        onToggleColorPicker={handleToggleColorPicker}
        onColorSelect={handleColorSelect}
        onDeleteRow={handleDeleteRow}
        onToggleFloat={handleToggleFloat}
        onRowSelect={handleEnhancedRowSelection}
        onDragStart={handleDragStartWrapper}
        onDragOver={handleDragOverWrapper}
        onDragLeave={handleDragLeaveWrapper}
        onDrop={handleDropWrapper}
        onCopySelectedRows={handleCopySelectedRows}
        onDeleteSelectedRows={handleDeleteSelectedRows}
        onPasteRows={handlePasteRows}
        onClearSelection={handleClearSelection}
        onAddRow={handleAddRow}
        onAddHeader={handleAddHeader}
        onJumpToHere={handleJumpToHere}
      />
    </div>
  );
};

export default RundownLayout;
