
import React, { useRef } from 'react';
import RundownTable from './RundownTable';
import { useRundownGridState } from '@/hooks/useRundownGridState';

const RundownGrid = () => {
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  const state = useRundownGridState();

  console.log('RundownGrid: handleAddRow exists?', !!state.handleAddRow);
  console.log('RundownGrid: handleAddHeader exists?', !!state.handleAddHeader);

  return (
    <RundownTable
      items={state.items}
      visibleColumns={state.visibleColumns}
      currentTime={state.currentTime}
      showColorPicker={state.showColorPicker}
      cellRefs={cellRefs}
      selectedRows={state.selectedRows}
      draggedItemIndex={state.draggedItemIndex}
      isDraggingMultiple={state.isDraggingMultiple}
      dropTargetIndex={state.dropTargetIndex}
      currentSegmentId={state.currentSegmentId}
      hasClipboardData={state.hasClipboardData}
      getColumnWidth={state.getColumnWidth}
      updateColumnWidth={state.updateColumnWidth}
      getRowNumber={state.getRowNumber}
      getRowStatus={state.getRowStatus}
      calculateHeaderDuration={state.calculateHeaderDuration}
      onUpdateItem={state.handleUpdateItem}
      onCellClick={state.handleCellClick}
      onKeyDown={state.handleKeyDown}
      onToggleColorPicker={state.handleToggleColorPicker}
      onColorSelect={state.handleColorSelect}
      onDeleteRow={state.deleteRow}
      onToggleFloat={state.handleToggleFloat}
      onRowSelect={state.handleRowSelection}
      onDragStart={state.handleDragStart}
      onDragOver={state.handleDragOver}
      onDragLeave={state.handleDragLeave}
      onDrop={state.handleDrop}
      onCopySelectedRows={state.handleCopySelectedRows}
      onDeleteSelectedRows={state.handleDeleteSelectedRows}
      onPasteRows={state.handlePasteRows}
      onClearSelection={state.clearSelection}
      onAddRow={state.handleAddRow}
      onAddHeader={state.handleAddHeader}
    />
  );
};

export default RundownGrid;
