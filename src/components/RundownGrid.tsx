
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
    clearRowSelection
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

  // Create a wrapper function that matches the expected signature
  const handleColorSelect = (id: string, color: string) => {
    selectColor(id, color);
  };

  // Enhanced row selection that properly handles both single and multi-selection
  const handleEnhancedRowSelection = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    console.log('🎯 Enhanced row selection called:', { itemId, index, isShiftClick, isCtrlClick, currentSelectedRowId: selectedRowId });
    
    if (isShiftClick || isCtrlClick) {
      // Multi-selection mode
      console.log('🎯 Multi-selection mode');
      handleMultiRowSelection(itemId, index, isShiftClick, isCtrlClick);
      // Clear single selection when doing multi-selection
      if (selectedRowId !== null) {
        clearRowSelection();
      }
    } else {
      // Single selection mode
      console.log('🎯 Single selection mode - setting selectedRowId to:', itemId);
      handleRowSelection(itemId);
      // Clear multi-selection when doing single selection
      if (selectedRows.size > 0) {
        clearSelection();
      }
    }
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
      getRowStatus={(item) => getRowStatus(item)}
      getHeaderDuration={calculateHeaderDuration}
      onUpdateItem={coreState.updateItem}
      onCellClick={handleCellClick}
      onKeyDown={handleKeyDown}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={handleColorSelect}
      onDeleteRow={coreState.deleteRow}
      onToggleFloat={coreState.toggleFloatRow}
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
        clearRowSelection();
      }}
      onAddRow={() => {
        console.log('🚀 RundownGrid onAddRow called with selectedRowId:', selectedRowId);
        handleAddRow(selectedRowId);
      }}
      onAddHeader={() => {
        console.log('🚀 RundownGrid onAddHeader called with selectedRowId:', selectedRowId);
        handleAddHeader(selectedRowId);
      }}
    />
  );
};

export default RundownGrid;
