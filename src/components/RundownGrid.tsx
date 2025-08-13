import React, { useEffect } from 'react';
import RundownContent from './RundownContent';
import { useRundownStateCoordination } from '@/hooks/useRundownStateCoordination';
import { useShowcallerStateCoordination } from '@/hooks/useShowcallerStateCoordination';
import { useAuth } from '@/hooks/useAuth';
import { useStableCallbacks } from '@/hooks/useStableCallbacks';
import { logger } from '@/utils/logger';

const RundownGrid = React.memo(() => {
  const { user } = useAuth();
  const userId = user?.id;

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
    rundownStartTime,
    rundownTitle,
    realtimeUpdateCounter
  } = coreState;

  // Update browser tab title when rundown title changes
  useEffect(() => {
    if (rundownTitle && rundownTitle !== 'Untitled Rundown') {
      document.title = rundownTitle;
    } else {
      document.title = 'Cuer Live';
    }

    // Cleanup: reset title when component unmounts
    return () => {
      document.title = 'Cuer Live';
    };
  }, [rundownTitle]);

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

  // Create stable callbacks to prevent unnecessary re-renders
  const stableCallbacks = useStableCallbacks({
    handleCellClick: (itemId: string, field: string) => {
      const mockEvent = { preventDefault: () => {}, stopPropagation: () => {} } as React.MouseEvent;
      uiState.handleCellClick(itemId, field, mockEvent);
    },
    handleKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => {
      const itemIndex = items.findIndex(item => item.id === itemId);
      uiState.handleKeyDown(e, itemId, field, itemIndex);
    },
    handleColorSelect: (id: string, color: string) => {
      uiState.selectColor(id, color);
    },
    handleEnhancedRowSelection: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
      // For header groups or any multi-row selection, use the grid handlers
      if (headerGroupItemIds && headerGroupItemIds.length > 1) {
        interactions.handleRowSelection(itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds);
        if (selectedRowId !== null) {
          clearRowSelection();
        }
      } else if (isShiftClick || isCtrlClick) {
        interactions.handleRowSelection(itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds);
        if (selectedRowId !== null) {
          clearRowSelection();
        }
      } else {
        handleRowSelection(itemId);
        if (interactions.selectedRows.size > 0) {
          interactions.clearSelection();
        }
      }
    },
    handleJumpToHere: (segmentId: string) => {
      const targetSegment = items.find(item => item.id === segmentId);
      if (!targetSegment) {
        logger.error('Target segment not found:', segmentId);
        return;
      }
      
      if (isPlaying) {
        play(segmentId);
      } else {
        jumpToSegment(segmentId);
      }
      
      // Clear selections
      if (interactions.selectedRows.size > 0) {
        interactions.clearSelection();
      }
      if (selectedRowId !== null) {
        clearRowSelection();
      }
    }
  });

  // Enhanced row status that uses showcaller visual state
  const getRowStatus = React.useCallback((item: any): 'upcoming' | 'current' | 'completed' => {
    if (item.type === 'header') {
      return 'upcoming'; // Headers don't have visual status
    }
    
    const visualStatus = getItemVisualStatus(item.id);
    if (visualStatus === 'current' || visualStatus === 'completed') {
      return visualStatus as 'current' | 'completed';
    }
    
    return 'upcoming';
  }, [getItemVisualStatus]);

  return (
    <RundownContent
      items={items}
      visibleColumns={visibleColumns}
      currentTime={currentTime}
      showColorPicker={uiState.showColorPicker}
      cellRefs={uiState.cellRefs}
      selectedRows={interactions.selectedRows}
      draggedItemIndex={interactions.draggedItemIndex}
      isDraggingMultiple={interactions.isDraggingMultiple}
      dropTargetIndex={interactions.dropTargetIndex}
      currentSegmentId={currentSegmentId}
      hasClipboardData={interactions.hasClipboardData()}
      selectedRowId={selectedRowId}
      isPlaying={isPlaying}
      autoScrollEnabled={coreState.autoScrollEnabled}
      startTime={rundownStartTime}
      onToggleAutoScroll={coreState.toggleAutoScroll}
      getColumnWidth={uiState.getColumnWidth}
      updateColumnWidth={uiState.updateColumnWidth}
      getRowNumber={coreState.getRowNumber}
      getRowStatus={getRowStatus}
      calculateHeaderDuration={coreState.calculateHeaderDuration}
      onUpdateItem={coreState.updateItem}
      onCellClick={stableCallbacks.handleCellClick}
      onKeyDown={stableCallbacks.handleKeyDown}
      onToggleColorPicker={uiState.handleToggleColorPicker}
      onColorSelect={stableCallbacks.handleColorSelect}
      onDeleteRow={coreState.deleteRow}
      onToggleFloat={coreState.toggleFloatRow}
      onRowSelect={(itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
        stableCallbacks.handleEnhancedRowSelection(itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds);
      }}
      onDragStart={interactions.handleDragStart}
      onDragOver={interactions.handleDragOver}
      onDragLeave={interactions.handleDragLeave}
      onDrop={interactions.handleDrop}
      onCopySelectedRows={interactions.handleCopySelectedRows}
      onDeleteSelectedRows={interactions.handleDeleteSelectedRows}
      onPasteRows={interactions.handlePasteRows}
      onClearSelection={() => {
        interactions.clearSelection();
        clearRowSelection();
      }}
      onAddRow={interactions.handleAddRow}
      onAddHeader={interactions.handleAddHeader}
      onJumpToHere={stableCallbacks.handleJumpToHere}
      // Header collapse functions
      toggleHeaderCollapse={coreState.toggleHeaderCollapse}
      isHeaderCollapsed={coreState.isHeaderCollapsed}
      getHeaderGroupItemIds={coreState.getHeaderGroupItemIds}
      visibleItems={coreState.visibleItems}
      realtimeUpdateCounter={realtimeUpdateCounter}
    />
  );
});

RundownGrid.displayName = 'RundownGrid';

export default RundownGrid;
