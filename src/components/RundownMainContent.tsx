
import React from 'react';
import RundownContent from './RundownContent';
import ColumnManager from './ColumnManager';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownMainContentProps {
  items: RundownItem[];
  visibleColumns: Column[];
  columns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  currentSegmentId: string | null;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  calculateHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  showColumnManager: boolean;
  handleAddColumn: (name: string) => void;
  handleReorderColumns: (columns: Column[]) => void;
  handleDeleteColumnWithCleanup: (columnId: string) => void;
  handleToggleColumnVisibility: (columnId: string) => void;
  handleLoadLayout: (layoutColumns: Column[]) => void;
  onCloseColumnManager: () => void;
}

const RundownMainContent = ({
  items,
  visibleColumns,
  columns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  currentSegmentId,
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
  onDrop,
  showColumnManager,
  handleAddColumn,
  handleReorderColumns,
  handleDeleteColumnWithCleanup,
  handleToggleColumnVisibility,
  handleLoadLayout,
  onCloseColumnManager
}: RundownMainContentProps) => {
  return (
    <>
      <RundownContent
        items={items}
        visibleColumns={visibleColumns}
        currentTime={currentTime}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        selectedRows={selectedRows}
        draggedItemIndex={draggedItemIndex}
        isDraggingMultiple={isDraggingMultiple}
        currentSegmentId={currentSegmentId}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        getRowNumber={getRowNumber}
        getRowStatus={getRowStatus}
        calculateHeaderDuration={calculateHeaderDuration}
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
        onDrop={onDrop}
      />

      {showColumnManager && (
        <ColumnManager
          columns={columns}
          onAddColumn={handleAddColumn}
          onReorderColumns={handleReorderColumns}
          onDeleteColumn={handleDeleteColumnWithCleanup}
          onToggleColumnVisibility={handleToggleColumnVisibility}
          onLoadLayout={(layoutColumns) => {
            handleReorderColumns(layoutColumns);
          }}
          onClose={onCloseColumnManager}
        />
      )}
    </>
  );
};

export default RundownMainContent;
