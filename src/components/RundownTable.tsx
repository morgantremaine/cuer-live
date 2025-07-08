
import React from 'react';
import RundownRow from './RundownRow';
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
  columnExpandState?: { [columnKey: string]: boolean };
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onToggleHeaderCollapse?: (headerId: string) => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
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
  hasClipboardData,
  selectedRowId,
  columnExpandState,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onToggleHeaderCollapse,
  isHeaderCollapsed,
  onJumpToHere
}: RundownTableProps) => {

  return (
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

            return (
              <React.Fragment key={item.id}>
                {/* Drop indicator ABOVE this row */}
                {dropTargetIndex === index && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-blue-500 w-full relative z-50"></div>
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
                  currentSegmentId={currentSegmentId}
                  isDragging={isDragging}
                  isCollapsed={isHeaderCollapsed ? isHeaderCollapsed(item.id) : false}
                  columnExpandState={columnExpandState}
                  onUpdateItem={onUpdateItem}
                  onCellClick={onCellClick}
                  onKeyDown={onKeyDown}
                  onToggleColorPicker={onToggleColorPicker}
                  onColorSelect={onColorSelect}
                  onDeleteRow={onDeleteRow}
                  onToggleFloat={onToggleFloat}
                  onRowSelect={onRowSelect}
                  onCopySelectedRows={onCopySelectedRows}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  onToggleCollapse={onToggleHeaderCollapse}
                  onPasteRows={onPasteRows}
                  onClearSelection={onClearSelection}
                  onAddRow={onAddRow}
                  onAddHeader={onAddHeader}
                  onJumpToHere={onJumpToHere}
                  getColumnWidth={getColumnWidth}
                />
                
                {/* Drop indicator AFTER the last row */}
                {dropTargetIndex === items.length && index === items.length - 1 && (
                  <tr>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-blue-500 w-full relative z-50"></div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
      {items.length === 0 && (
        <tr>
          <td colSpan={visibleColumns.length + 1} className="p-4 text-center text-muted-foreground">
            No items to display
          </td>
        </tr>
      )}
    </tbody>
  );
};

export default RundownTable;
