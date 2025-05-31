
import React from 'react';
import RundownTableHeader from './RundownTableHeader';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
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
}

const RundownTable = ({
  items,
  visibleColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  selectedRows,
  draggedItemIndex,
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
  onDrop
}: RundownTableProps) => {
  return (
    <div className="w-full">
      <table className="w-full min-w-max">
        <RundownTableHeader
          visibleColumns={visibleColumns}
          getColumnWidth={getColumnWidth}
          updateColumnWidth={updateColumnWidth}
        />
        <tbody>
          {items.map((item, index) => (
            <RundownRow
              key={item.id}
              item={item}
              index={index}
              rowNumber={getRowNumber(index)}
              status={item.status}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              columns={visibleColumns}
              isSelected={selectedRows.has(item.id)}
              isCurrentlyPlaying={!isHeaderItem(item) && currentSegmentId === item.id}
              headerDuration={isHeaderItem(item) ? calculateHeaderDuration(index) : ''}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              onToggleColorPicker={onToggleColorPicker}
              onColorSelect={(id, color) => onColorSelect(id, color)}
              onDeleteRow={onDeleteRow}
              onToggleFloat={onToggleFloat}
              onRowSelect={onRowSelect}
              onDragStart={onDragStart}
              onDragOver={onDragOver}
              onDrop={onDrop}
              isDragging={draggedItemIndex === index}
              getColumnWidth={getColumnWidth}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RundownTable;
