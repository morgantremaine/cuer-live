
import React from 'react';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface RundownTableProps {
  items: any[];
  fullItems?: any[];
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
  expandedCells?: Set<string>;
  onToggleCellExpanded?: (itemId: string, columnKey: string) => void;
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
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onToggleHeaderCollapse?: (headerId: string) => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
  onJumpToHere?: (segmentId: string) => void;
  onMoveItemUp?: (index: number) => void;
  onMoveItemDown?: (index: number) => void;
  markActiveTyping?: () => void;
  // Per-cell editor indicators
  getEditorForCell?: (itemId: string, field: string) => { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
  onScrollToEditor?: (itemId: string) => void;
}

const RundownTable = ({
  items,
  fullItems,
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
  expandedCells,
  onToggleCellExpanded,
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
  onDragEnd,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onToggleHeaderCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds,
  onJumpToHere,
  onMoveItemUp,
  onMoveItemDown,
  markActiveTyping,
  getEditorForCell,
  onCellFocus,
  onCellBlur,
  onScrollToEditor
}: RundownTableProps) => {

  // Enhanced drag over handler that calculates drop target index
  const handleRowDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e, targetIndex);
  };

  // Enhanced drop handler with better error handling
  const handleRowDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      onDrop(e, targetIndex);
    } catch (error) {
      // Force reset drag state on error
      onDragEnd?.(e);
    }
  };

  // Enhanced drag end handler
  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd?.(e);
  };

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
                  <tr key={`drop-above-${item.id}`}>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-blue-500 w-full relative z-50"></div>
                    </td>
                  </tr>
                )}
                
                <RundownRow
                  key={item.id}
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
                  expandedCells={expandedCells}
                  onToggleCellExpanded={onToggleCellExpanded}
                  onUpdateItem={onUpdateItem}
                  onCellClick={onCellClick}
                  onKeyDown={onKeyDown}
                  onToggleColorPicker={onToggleColorPicker}
                  onColorSelect={onColorSelect}
                  onDeleteRow={onDeleteRow}
                  onToggleFloat={onToggleFloat}
                  onRowSelect={onRowSelect}
                  onDragStart={onDragStart}
                  onDragOver={(e) => handleRowDragOver(e, index)}
                  onDrop={(e) => handleRowDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onCopySelectedRows={onCopySelectedRows}
                  onDeleteSelectedRows={onDeleteSelectedRows}
                  onToggleCollapse={onToggleHeaderCollapse}
                  onPasteRows={onPasteRows}
                  onClearSelection={onClearSelection}
                   onAddRow={onAddRow}
                   onAddHeader={onAddHeader}
                   onJumpToHere={onJumpToHere}
                   onMoveUp={() => onMoveItemUp?.(index)}
                   onMoveDown={() => onMoveItemDown?.(index)}
                   markActiveTyping={markActiveTyping}
                   getColumnWidth={getColumnWidth}
                   isHeaderCollapsed={isHeaderCollapsed}
                   getHeaderGroupItemIds={getHeaderGroupItemIds}
                   allItems={fullItems || items}
                   getEditorForCell={getEditorForCell}
                   onCellFocus={onCellFocus}
                   onCellBlur={onCellBlur}
                   onScrollToEditor={onScrollToEditor}
                />
                
                {/* Drop indicator AFTER the last row */}
                {dropTargetIndex === items.length && index === items.length - 1 && (
                  <tr key={`drop-after-${item.id}`}>
                    <td colSpan={visibleColumns.length + 1} className="p-0">
                      <div className="h-0.5 bg-blue-500 w-full relative z-50"></div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
    </tbody>
  );
};

export default RundownTable;
