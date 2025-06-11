
import React from 'react';
import RundownRow from './RundownRow';
import RundownTableHeader from './RundownTableHeader';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableProps {
  items: any[];
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
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: any) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
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
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
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
  onAddHeader
}: RundownTableProps) => {

  return (
    <div className="relative w-full h-full overflow-auto bg-background">
      <table className="w-full border-collapse border border-border table-fixed">
        <RundownTableHeader 
          visibleColumns={visibleColumns}
          getColumnWidth={getColumnWidth}
          updateColumnWidth={updateColumnWidth}
        />
        <tbody className="bg-background">
          {items.map((item, index) => {
            const rowNumber = getRowNumber(index);
            const status = getRowStatus(item);
            const headerDuration = isHeaderItem(item) ? getHeaderDuration(index) : '';
            const isMultiSelected = selectedRows.has(item.id);
            const isSingleSelected = selectedRowId === item.id;
            const isActuallySelected = isMultiSelected || isSingleSelected;
            const isDragging = draggedItemIndex === index;
            const isCurrentlyPlaying = item.id === currentSegmentId;

            console.log(`🎯 Table rendering item ${item.id}: multiSelected=${isMultiSelected}, singleSelected=${isSingleSelected}, actuallySelected=${isActuallySelected}`);

            return (
              <React.Fragment key={item.id}>
                {/* Show green line ABOVE the current segment */}
                {isCurrentlyPlaying && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-1 bg-green-500 w-full"></div>
                    </td>
                  </tr>
                )}
                
                <RundownRow
                  item={item}
                  index={index}
                  rowNumber={rowNumber}
                  status={status}
                  showColorPicker={showColorPicker}
                  cellRefs={cellRefs}
                  columns={visibleColumns}
                  isSelected={isActuallySelected}
                  isCurrentlyPlaying={isCurrentlyPlaying}
                  isDraggingMultiple={isDraggingMultiple}
                  selectedRowsCount={selectedRows.size}
                  selectedRows={selectedRows}
                  headerDuration={headerDuration}
                  hasClipboardData={hasClipboardData}
                  isDragging={isDragging}
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
                  getColumnWidth={getColumnWidth}
                />
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      
      {items.length === 0 && (
        <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
          No items to display
        </div>
      )}
    </div>
  );
};

export default RundownTable;
