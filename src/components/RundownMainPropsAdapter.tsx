
import React from 'react';
import RundownMainContent from './RundownMainContent';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  return (
    <RundownMainContent
      items={props.items}
      visibleColumns={props.visibleColumns}
      columns={props.columns}
      currentTime={props.currentTime}
      showColorPicker={props.showColorPicker}
      cellRefs={props.cellRefs}
      selectedRows={props.selectedRows}
      draggedItemIndex={props.draggedItemIndex}
      isDraggingMultiple={props.isDraggingMultiple}
      dropTargetIndex={props.dropTargetIndex}
      currentSegmentId={props.currentSegmentId}
      hasClipboardData={props.hasClipboardData}
      getColumnWidth={props.getColumnWidth}
      updateColumnWidth={props.updateColumnWidth}
      getRowNumber={props.getRowNumber}
      getRowStatus={props.getRowStatus}
      calculateHeaderDuration={props.calculateHeaderDuration}
      onUpdateItem={props.onUpdateItem}
      onCellClick={props.onCellClick}
      onKeyDown={props.onKeyDown}
      onToggleColorPicker={props.onToggleColorPicker}
      onColorSelect={props.onColorSelect}
      onDeleteRow={props.onDeleteRow}
      onToggleFloat={props.onToggleFloat}
      onRowSelect={props.onRowSelect}
      onDragStart={props.onDragStart}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      onCopySelectedRows={props.onCopySelectedRows}
      onDeleteSelectedRows={props.onDeleteSelectedRows}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
      showColumnManager={props.showColumnManager}
      handleAddColumn={props.handleAddColumn}
      handleReorderColumns={props.handleReorderColumns}
      handleDeleteColumnWithCleanup={props.handleDeleteColumnWithCleanup}
      handleToggleColumnVisibility={props.handleToggleColumnVisibility}
      handleLoadLayout={props.handleLoadLayout}
      onCloseColumnManager={() => props.setShowColumnManager(false)}
    />
  );
};

export default RundownMainPropsAdapter;
