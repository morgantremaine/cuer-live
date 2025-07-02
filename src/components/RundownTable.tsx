
import React from 'react';
import RundownRow from './RundownRow';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  selectedRowId?: string | null;
  highlightedItemId?: string | null;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

const RundownTable = ({
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
  hasClipboardData = false,
  selectedRowId = null,
  highlightedItemId,
  getColumnWidth,
  updateColumnWidth,
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
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
  onJumpToHere
}: RundownTableProps) => {
  return (
    <table className="w-full border-collapse table-fixed">
      <tbody>
        {items.map((item, index) => (
          <RundownRow
            key={item.id}
            item={item}
            index={index}
            visibleColumns={visibleColumns}
            currentTime={currentTime}
            showColorPicker={showColorPicker}
            cellRefs={cellRefs}
            isSelected={selectedRows.has(item.id)}
            isDragged={draggedItemIndex === index}
            isDraggingMultiple={isDraggingMultiple}
            isDropTarget={dropTargetIndex === index}
            currentSegmentId={currentSegmentId}
            hasClipboardData={hasClipboardData}
            selectedRowId={selectedRowId}
            isHighlighted={highlightedItemId === item.id}
            getColumnWidth={getColumnWidth}
            updateColumnWidth={updateColumnWidth}
            getRowNumber={getRowNumber}
            getRowStatus={getRowStatus}
            getHeaderDuration={getHeaderDuration}
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
            onJumpToHere={onJumpToHere}
            data-item-id={item.id}
          />
        ))}
      </tbody>
    </table>
  );
};

export default RundownTable;
