
import React from 'react';
import RundownContent from './RundownContent';
import { RundownContainerProps } from '@/types/rundownContainer';

const RundownContainer = (props: RundownContainerProps) => {
  const {
    items,
    visibleColumns,
    currentTime,
    showColorPicker,
    cellRefs,
    selectedRows,
    draggedItemIndex,
    isDraggingMultiple,
    dropTargetIndex,
    currentSegmentId,
    hasClipboardData,
    selectedRowId,
    getColumnWidth,
    updateColumnWidth,
    getRowNumber,
    getRowStatus,
    calculateHeaderDuration,
    onUpdateItem,
    onCellClick,
    onKeyDown,
    onToggleColorPicker,
    onColorSelect,
    onDeleteRow,
    onToggleFloat,
    onRowSelect,
    onDragStart,
    onDragOver,
    onDragLeave,
    onDrop,
    onCopySelectedRows,
    onDeleteSelectedRows,
    onPasteRows,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onPlay
  } = props;

  return (
    <div className="rundown-container">
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
        hasClipboardData={hasClipboardData}
        selectedRowId={selectedRowId}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
        getHeaderDuration={calculateHeaderDuration}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        onToggleColorPicker={onToggleColorPicker}
        onColorSelect={onColorSelect}
        onDeleteRow={onDeleteRow}
        onToggleFloat={onToggleFloat}
        onRowSelect={onRowSelect}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onCopySelectedRows={onCopySelectedRows}
        onDeleteSelectedRows={onDeleteSelectedRows}
        onPasteRows={onPasteRows}
        onClearSelection={onClearSelection}
        onAddRow={onAddRow}
        onAddHeader={onAddHeader}
        onPlay={onPlay}
      />
    </div>
  );
};

export default RundownContainer;
