
import React, { useCallback, useRef, memo, useMemo } from 'react';
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
  // User role for permissions
  userRole?: 'admin' | 'manager' | 'member' | 'showcaller' | 'teleprompter' | null;
}

// Memoized drop indicator row - only re-renders when visible
const DropIndicatorRow = memo(({ colSpan }: { colSpan: number }) => (
  <tr className="drop-indicator-row">
    <td colSpan={colSpan} className="p-0 border-0">
      <div className="h-0.5 bg-blue-500 w-full" />
    </td>
  </tr>
), () => true); // Never re-render - appearance is static

DropIndicatorRow.displayName = 'DropIndicatorRow';

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
  onScrollToEditor,
  userRole
}: RundownTableProps) => {
  // Stable drag over handler - takes index as parameter from row
  const handleRowDragOver = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    onDragOver(e, targetIndex);
  }, [onDragOver]);

  // Stable drop handler
  const handleRowDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      onDrop(e, targetIndex);
    } catch (error) {
      onDragEnd?.(e);
    }
  }, [onDrop, onDragEnd]);

  // Stable drag end handler
  const handleDragEnd = useCallback((e: React.DragEvent) => {
    onDragEnd?.(e);
  }, [onDragEnd]);

  // Pre-compute which index needs the drop indicator
  const colSpan = visibleColumns.length + 1;

  // Build rows with drop indicators inserted at the right positions
  const rows = useMemo(() => {
    const result: React.ReactNode[] = [];
    
    items.forEach((item, index) => {
      // Add drop indicator BEFORE this row if needed
      if (dropTargetIndex === index) {
        result.push(
          <DropIndicatorRow key={`drop-${index}`} colSpan={colSpan} />
        );
      }

      const rowNumber = getRowNumber(index);
      const status = getRowStatus(item);
      const headerDuration = isHeaderItem(item) ? getHeaderDuration(index) : '';
      const isMultiSelected = selectedRows.has(item.id);
      const isSingleSelected = selectedRowId === item.id;
      const isActuallySelected = isMultiSelected || isSingleSelected;
      const isDragging = draggedItemIndex === index;
      const isCurrentlyPlaying = item.id === currentSegmentId;

      result.push(
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
          onDragOver={handleRowDragOver}
          onDrop={handleRowDrop}
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
          userRole={userRole}
        />
      );
    });

    // Add drop indicator AFTER the last row if needed
    if (dropTargetIndex === items.length) {
      result.push(
        <DropIndicatorRow key="drop-end" colSpan={colSpan} />
      );
    }

    return result;
  }, [
    items, dropTargetIndex, colSpan, getRowNumber, getRowStatus, getHeaderDuration,
    selectedRows, selectedRowId, draggedItemIndex, currentSegmentId, showColorPicker,
    cellRefs, visibleColumns, isDraggingMultiple, hasClipboardData, isHeaderCollapsed,
    columnExpandState, expandedCells, onToggleCellExpanded, onUpdateItem, onCellClick,
    onKeyDown, onToggleColorPicker, onColorSelect, onDeleteRow, onToggleFloat,
    onRowSelect, onDragStart, handleRowDragOver, handleRowDrop, handleDragEnd,
    onCopySelectedRows, onDeleteSelectedRows, onToggleHeaderCollapse, onPasteRows,
    onClearSelection, onAddRow, onAddHeader, onJumpToHere, onMoveItemUp, onMoveItemDown,
    markActiveTyping, getColumnWidth, getHeaderGroupItemIds, fullItems, getEditorForCell,
    onCellFocus, onCellBlur, onScrollToEditor, userRole
  ]);

  return (
    <tbody className="bg-background">
      {rows}
    </tbody>
  );
};

export default RundownTable;
