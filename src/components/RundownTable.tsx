import React, { memo, useMemo } from 'react';
import MemoizedRundownRow from './MemoizedRundownRow';
import RundownRow from './RundownRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';

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
  startTime: string;
  columnExpandState?: { [columnKey: string]: boolean };
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
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
  getRowNumber: (index: number) => string;
  getRowStatus: (item: any) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
  onToggleHeaderCollapse: (headerId: string) => void;
  isHeaderCollapsed: (headerId: string) => boolean;
  getHeaderGroupItemIds: (headerId: string) => string[];
  onJumpToHere?: (segmentId: string) => void;
  markActiveTyping?: () => void;
}

const RundownTable = memo(({
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
  startTime,
  columnExpandState,
  getColumnWidth,
  updateColumnWidth,
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
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
  onToggleHeaderCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds,
  onJumpToHere,
  markActiveTyping
}: RundownTableProps) => {
  
  // Memoize frequently used calculations to prevent re-computation
  const memoizedRows = useMemo(() => {
    return items.map((item, index) => ({
      item,
      index,
      rowNumber: getRowNumber(index),
      status: getRowStatus(item),
      headerDuration: isHeaderItem(item) ? getHeaderDuration(index) : '',
      isMultiSelected: selectedRows.has(item.id),
      isSingleSelected: selectedRowId === item.id,
      isDragging: draggedItemIndex === index,
      isCurrentlyPlaying: item.id === currentSegmentId
    }));
  }, [
    items, 
    getRowNumber, 
    getRowStatus, 
    getHeaderDuration, 
    selectedRows, 
    selectedRowId, 
    draggedItemIndex, 
    currentSegmentId
  ]);

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

  // Throttled logging to prevent console spam during typing
  const shouldLog = useMemo(() => Math.random() < 0.01, []); // Only log 1% of renders
  if (shouldLog) {
    console.log(`🎭 Table rendering: ${items.length} items (optimized)`);
  }

  return (
    <tbody className="bg-background">
      {memoizedRows.map(({ 
        item, 
        index, 
        rowNumber, 
        status, 
        headerDuration, 
        isMultiSelected, 
        isSingleSelected, 
        isDragging, 
        isCurrentlyPlaying 
      }) => {
        const isActuallySelected = isMultiSelected || isSingleSelected;

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
            
            <MemoizedRundownRow
              item={item}
              index={index}
              rowNumber={rowNumber}
              status={status}
              showColorPicker={showColorPicker}
              cellRefs={cellRefs}
              columns={visibleColumns}
              headerDuration={headerDuration}
              isSelected={isActuallySelected}
              isDragging={isDragging}
              isCurrentlyPlaying={isCurrentlyPlaying}
              isDraggingMultiple={isDraggingMultiple}
              hasClipboardData={hasClipboardData}
              columnExpandState={columnExpandState}
              getColumnWidth={getColumnWidth}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              onToggleColorPicker={onToggleColorPicker}
              onColorSelect={onColorSelect}
              onDeleteRow={onDeleteRow}
              onToggleFloat={onToggleFloat}
              onRowSelect={onRowSelect}
              onDragStart={(e) => onDragStart(e, index)}
              onDragOver={(e) => handleRowDragOver(e, index)}
              onDrop={(e) => handleRowDrop(e, index)}
              onDragEnd={handleDragEnd}
              onCopySelectedRows={onCopySelectedRows}
              onDeleteSelectedRows={onDeleteSelectedRows}
              onPasteRows={onPasteRows}
              onClearSelection={onClearSelection}
              onAddRow={onAddRow}
              onAddHeader={onAddHeader}
              onJumpToHere={onJumpToHere}
              markActiveTyping={markActiveTyping}
              onToggleCollapse={onToggleHeaderCollapse}
              isHeaderCollapsed={isHeaderCollapsed}
              getHeaderGroupItemIds={getHeaderGroupItemIds}
            />

            {/* Drop indicator AFTER last row */}
            {dropTargetIndex === index + 1 && (
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
}, (prevProps, nextProps) => {
  // Custom comparison function for maximum performance during typing
  // Only re-render if essential props actually changed
  if (
    prevProps.items !== nextProps.items ||
    prevProps.visibleColumns !== nextProps.visibleColumns ||
    prevProps.selectedRowId !== nextProps.selectedRowId ||
    prevProps.currentSegmentId !== nextProps.currentSegmentId ||
    prevProps.draggedItemIndex !== nextProps.draggedItemIndex ||
    prevProps.dropTargetIndex !== nextProps.dropTargetIndex ||
    prevProps.showColorPicker !== nextProps.showColorPicker
  ) {
    return false; // Re-render
  }
  
  // Check if selected rows changed
  if (prevProps.selectedRows.size !== nextProps.selectedRows.size) {
    return false;
  }
  
  // Skip deep comparison of selectedRows for performance if sizes match
  // The items reference change will trigger re-render when needed
  
  return true; // Skip re-render
});

export default RundownTable;