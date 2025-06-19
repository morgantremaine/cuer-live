
import React from 'react';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import RundownTableHeader from './RundownTableHeader';
import RundownRow from './RundownRow';

interface RundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: string;
  showColorPicker: { [key: string]: boolean };
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData: boolean;
  selectedRowId: string | null;
  getColumnWidth: (columnId: string) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (item: RundownItem) => number;
  getRowStatus: (item: RundownItem) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (item: RundownItem) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (id: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  highlightedCell?: {
    itemId: string;
    field: string;
    startIndex: number;
    endIndex: number;
  } | null;
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
  hasClipboardData,
  selectedRowId,
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
  highlightedCell
}: RundownTableProps) => {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <RundownTableHeader 
          visibleColumns={visibleColumns}
          getColumnWidth={(column: Column) => getColumnWidth(column.id)}
          updateColumnWidth={updateColumnWidth}
        />
        <tbody>
          {items.map((item, index) => (
            <RundownRow
              key={item.id}
              item={item}
              index={index}
              visibleColumns={visibleColumns}
              cellRefs={cellRefs}
              isSelected={selectedRows.has(item.id) || selectedRowId === item.id}
              isDragged={draggedItemIndex === index}
              isDropTarget={dropTargetIndex === index}
              isDraggingMultiple={isDraggingMultiple}
              showColorPicker={showColorPicker[item.id] || false}
              isCurrent={currentSegmentId === item.id}
              getColumnWidth={getColumnWidth}
              rowNumber={getRowNumber(item)}
              rowStatus={getRowStatus(item)}
              headerDuration={getHeaderDuration(item)}
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
              onDeleteSelectedRows={onDeleteSelectedRows}
              onCopySelectedRows={onCopySelectedRows}
              highlightedCell={highlightedCell}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RundownTable;
