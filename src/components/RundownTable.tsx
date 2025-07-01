
import React, { Fragment } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import RundownRow from './RundownRow';
import RundownTableHeader from './RundownTableHeader';
import { TimingStatus } from '@/hooks/useShowcallerUnifiedTiming';

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
  hasClipboardData: boolean;
  selectedRowId: string | null;
  timingStatus?: TimingStatus;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem, currentTime: Date) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (headerIndex: number) => string;
  onUpdateItem: (id: string, field: string, value: any) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
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
  onJumpToHere: (segmentId: string) => void;
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
  timingStatus,
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
    <div className="space-y-0">
      <RundownTableHeader
        visibleColumns={visibleColumns}
        getColumnWidth={getColumnWidth}
        updateColumnWidth={updateColumnWidth}
        timingStatus={timingStatus}
      />
      <div className="space-y-0">
        {items.map((item, index) => (
          <Fragment key={item.id}>
            <RundownRow
              item={item}
              index={index}
              rowNumber={getRowNumber(index)}
              columns={visibleColumns}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              isSelected={selectedRows.has(item.id)}
              isDragged={draggedItemIndex === index}
              isDraggingMultiple={isDraggingMultiple}
              isDropTarget={dropTargetIndex === index}
              isCurrentSegment={currentSegmentId === item.id}
              hasClipboardData={hasClipboardData}
              isSelectedRow={selectedRowId === item.id}
              status={getRowStatus(item, currentTime)}
              headerDuration={item.type === 'header' ? getHeaderDuration(index) : undefined}
              getColumnWidth={getColumnWidth}
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
              isDragging={draggedItemIndex === index}
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
};

export default RundownTable;
