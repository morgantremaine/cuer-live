
import React from 'react';
import RundownTableHeader from './RundownTableHeader';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';

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
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  currentHighlight?: SearchHighlight | null;
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
  onDragLeave,
  onDrop,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  currentHighlight
}: RundownTableProps) => {
  
  // Add debugging for the onRowSelect function
  const debugOnRowSelect = (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    console.log('RundownTable - onRowSelect called with:', { itemId, index, isShiftClick, isCtrlClick });
    console.log('RundownTable - current selectedRows before selection:', selectedRows);
    onRowSelect(itemId, index, isShiftClick, isCtrlClick);
    console.log('RundownTable - selectedRows after onRowSelect call:', selectedRows);
  };
  
  return (
    <div 
      className="w-full"
      onDragLeave={onDragLeave}
    >
      <table className="w-full min-w-max">
        <RundownTableHeader
          visibleColumns={visibleColumns}
          getColumnWidth={getColumnWidth}
          updateColumnWidth={updateColumnWidth}
        />
        <tbody>
          {items.map((item, index) => (
            <React.Fragment key={item.id}>
              {/* Drop indicator above current row */}
              {dropTargetIndex === index && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-0">
                    <div className="h-0.5 bg-gray-400 mx-2"></div>
                  </td>
                </tr>
              )}
              
              <RundownRow
                item={item}
                index={index}
                rowNumber={getRowNumber(index)}
                status={item.status}
                showColorPicker={showColorPicker}
                cellRefs={cellRefs}
                columns={visibleColumns}
                isSelected={selectedRows.has(item.id)}
                isCurrentlyPlaying={!isHeaderItem(item) && currentSegmentId === item.id}
                isDraggingMultiple={isDraggingMultiple && selectedRows.has(item.id)}
                selectedRowsCount={selectedRows.size}
                selectedRows={selectedRows}
                headerDuration={isHeaderItem(item) ? calculateHeaderDuration(index) : ''}
                hasClipboardData={hasClipboardData}
                currentHighlight={currentHighlight}
                onUpdateItem={onUpdateItem}
                onCellClick={onCellClick}
                onKeyDown={onKeyDown}
                onToggleColorPicker={onToggleColorPicker}
                onColorSelect={(id, color) => onColorSelect(id, color)}
                onDeleteRow={onDeleteRow}
                onToggleFloat={onToggleFloat}
                onRowSelect={debugOnRowSelect}
                onDragStart={onDragStart}
                onDragOver={(e) => onDragOver(e, index)}
                onDrop={onDrop}
                onCopySelectedRows={onCopySelectedRows}
                onDeleteSelectedRows={onDeleteSelectedRows}
                onPasteRows={onPasteRows}
                onClearSelection={onClearSelection}
                isDragging={draggedItemIndex === index}
                getColumnWidth={getColumnWidth}
              />
              
              {/* Drop indicator after last row */}
              {index === items.length - 1 && dropTargetIndex === items.length && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-0">
                    <div className="h-0.5 bg-gray-400 mx-2"></div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default RundownTable;
