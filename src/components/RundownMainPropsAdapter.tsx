
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

  const handleReorderColumns = (startIndex: number, endIndex: number) => {
    // For now, we'll use a simple implementation
    props.handleReorderColumns(startIndex, endIndex);
  };

  // Create adapter for getColumnWidth that expects Column but receives string
  const getColumnWidthAdapter = (column: any) => {
    if (typeof column === 'string') {
      // If it's a string (columnId), find the column and return default width
      return '150px';
    }
    // If it's actually a Column object, use the original function
    return props.getColumnWidth(column);
  };

  // Create adapter for getRowStatus to match expected return type
  const getRowStatusAdapter = (item: any, currentTime: Date) => {
    const status = props.getRowStatus(item);
    // Map 'past' to 'completed' to match expected type
    if (status === 'past') return 'completed';
    return status as 'upcoming' | 'current' | 'completed';
  };

  return (
    <RundownMainContent
      currentTime={props.currentTime}
      items={props.items}
      visibleColumns={props.visibleColumns}
      columns={props.columns}
      showColorPicker={Boolean(props.showColorPicker)}
      cellRefs={props.cellRefs as React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>}
      selectedRows={props.selectedRows}
      draggedItemIndex={props.draggedItemIndex}
      isDraggingMultiple={props.isDraggingMultiple}
      dropTargetIndex={props.dropTargetIndex}
      currentSegmentId={props.currentSegmentId}
      hasClipboardData={props.hasClipboardData}
      getColumnWidth={getColumnWidthAdapter}
      updateColumnWidth={props.updateColumnWidth}
      getRowNumber={props.getRowNumber}
      getRowStatus={getRowStatusAdapter}
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
      timeRemaining={props.timeRemaining || 0}
      isPlaying={props.isPlaying}
      currentSegmentName={props.currentSegmentId ? props.items.find(item => item.id === props.currentSegmentId)?.name || '' : ''}
      totalDuration={props.items.find(item => item.id === props.currentSegmentId)?.duration || '00:00'}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
    />
  );
};

export default RundownMainPropsAdapter;
