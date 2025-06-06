
import React from 'react';
import RundownMainContent from './RundownMainContent';
import { RundownContainerProps } from '@/types/rundownContainer';

interface RundownMainPropsAdapterProps {
  props: RundownContainerProps;
}

const RundownMainPropsAdapter = ({ props }: RundownMainPropsAdapterProps) => {
  // Create wrapper functions to match expected signatures
  const handleCellClick = (itemId: string, field: string) => {
    props.onCellClick(itemId, field, {} as React.MouseEvent);
  };

  const handleRowSelect = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    const mockEvent = {
      shiftKey: isShiftClick,
      ctrlKey: isCtrlClick,
      metaKey: isCtrlClick
    } as React.MouseEvent;
    props.onRowSelect(itemId, mockEvent);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    props.onDragStart(index);
  };

  const handleDragOver = (e: React.DragEvent, index?: number) => {
    if (index !== undefined) {
      props.onDragOver(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    props.onDragLeave();
  };

  const handleDrop = (e: React.DragEvent, index: number) => {
    props.onDrop(index);
  };

  const handleAddColumn = (name: string) => {
    props.handleAddColumn(name, 'text'); // Default type
  };

  const handleReorderColumns = (columns: any) => {
    // This needs to be handled differently - for now, pass through
    if (Array.isArray(columns)) {
      props.handleLoadLayout(columns);
    }
  };

  return (
    <RundownMainContent
      currentTime={props.currentTime}
      items={props.items}
      visibleColumns={props.visibleColumns}
      columns={props.columns}
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
      onCellClick={handleCellClick}
      onKeyDown={props.onKeyDown}
      onToggleColorPicker={props.onToggleColorPicker}
      onColorSelect={props.onColorSelect}
      onDeleteRow={props.onDeleteRow}
      onToggleFloat={props.onToggleFloat}
      onRowSelect={handleRowSelect}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onCopySelectedRows={props.onCopySelectedRows}
      onDeleteSelectedRows={props.onDeleteSelectedRows}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
      showColumnManager={props.showColumnManager}
      setShowColumnManager={props.setShowColumnManager}
      handleAddColumn={handleAddColumn}
      handleReorderColumns={handleReorderColumns}
      handleDeleteColumnWithCleanup={props.handleDeleteColumnWithCleanup}
      handleRenameColumn={props.handleRenameColumn}
      handleToggleColumnVisibility={props.handleToggleColumnVisibility}
      handleLoadLayout={props.handleLoadLayout}
      timeRemaining={props.timeRemaining}
      isPlaying={props.isPlaying}
      currentSegmentName={props.currentSegmentId ? props.items.find(item => item.id === props.currentSegmentId)?.name || '' : ''}
      totalDuration={props.items.find(item => item.id === props.currentSegmentId)?.duration || '00:00'}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
    />
  );
};

export default RundownMainPropsAdapter;
