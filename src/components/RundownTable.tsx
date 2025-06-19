
import React from 'react';
import RundownTableHeader from './RundownTableHeader';
import RundownRow from './RundownRow';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';

interface RundownTableProps {
  items: RundownItem[];
  columns: Column[];
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  selectedRows: Set<string>;
  currentlyPlayingId?: string;
  isDraggingMultiple?: boolean;
  hasClipboardData?: boolean;
  currentHighlight?: SearchHighlight | null;
  isShowcallerController?: boolean;
  jumpTo?: (segmentId: string) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  getColumnWidth: (column: Column) => string;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (headerId: string) => string;
  isDragging: boolean;
}

const RundownTable = ({
  items,
  columns,
  showColorPicker,
  cellRefs,
  selectedRows,
  currentlyPlayingId,
  isDraggingMultiple,
  hasClipboardData,
  currentHighlight,
  isShowcallerController,
  jumpTo,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  getColumnWidth,
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
  isDragging
}: RundownTableProps) => {
  return (
    <div className="flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <RundownTableHeader 
          columns={columns}
          getColumnWidth={getColumnWidth}
        />
        <tbody>
          {items.map((item, index) => (
            <RundownRow
              key={item.id}
              item={item}
              index={index}
              rowNumber={getRowNumber(index)}
              status={getRowStatus(item)}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              columns={columns}
              isSelected={selectedRows.has(item.id)}
              isCurrentlyPlaying={currentlyPlayingId === item.id}
              isDraggingMultiple={isDraggingMultiple}
              selectedRowsCount={selectedRows.size}
              selectedRows={selectedRows}
              headerDuration={getHeaderDuration(item.id)}
              hasClipboardData={hasClipboardData}
              currentHighlight={currentHighlight}
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
              onCopySelectedRows={onCopySelectedRows}
              onDeleteSelectedRows={onDeleteSelectedRows}
              onPasteRows={onPasteRows}
              onClearSelection={onClearSelection}
              onAddRow={onAddRow}
              onAddHeader={onAddHeader}
              onJumpToHere={jumpTo}
              isShowcallerController={isShowcallerController}
              isDragging={isDragging}
              getColumnWidth={getColumnWidth}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RundownTable;
