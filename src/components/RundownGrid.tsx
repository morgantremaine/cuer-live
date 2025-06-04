
import React, { useRef } from 'react';
import RundownTable from './RundownTable';
import { useRundownGridState } from '@/hooks/useRundownGridState';
import { useRundownGridUI } from '@/hooks/useRundownGridUI';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useCellNavigation } from '@/hooks/useCellNavigation';

const RundownGrid = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  const {
    items,
    visibleColumns,
    currentTime,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId,
    hasClipboardData,
    getColumnWidth,
    updateColumnWidth,
    handleUpdateItem,
    handleRowSelection,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleCopySelectedRows,
    handleDeleteSelectedRows,
    handlePasteRows,
    onClearSelection,
    handleAddRow,
    handleAddHeader,
    onToggleFloat,
    onDeleteRow,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration
  } = useRundownGridState();

  const { showColorPicker, handleToggleColorPicker, selectColor } = useColorPicker();

  const { handleCellClick, handleKeyDown } = useCellNavigation(
    items,
    visibleColumns,
    cellRefs,
    handleUpdateItem
  );

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
      hasClipboardData={hasClipboardData}
      getColumnWidth={getColumnWidth}
      updateColumnWidth={updateColumnWidth}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      calculateHeaderDuration={calculateHeaderDuration}
      onUpdateItem={handleUpdateItem}
      onCellClick={handleCellClick}
      onKeyDown={handleKeyDown}
      onToggleColorPicker={handleToggleColorPicker}
      onColorSelect={selectColor}
      onDeleteRow={onDeleteRow}
      onToggleFloat={onToggleFloat}
      onRowSelect={handleRowSelection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onCopySelectedRows={handleCopySelectedRows}
      onDeleteSelectedRows={handleDeleteSelectedRows}
      onPasteRows={handlePasteRows}
      onClearSelection={onClearSelection}
      onAddRow={handleAddRow}
      onAddHeader={handleAddHeader}
    />
  );
};

export default RundownGrid;
