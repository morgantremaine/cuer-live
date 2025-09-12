import React, { memo } from 'react';
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

  // REMOVE DOM LIMITING - users need to see everything!
  // The real issue is render loops, not DOM size
  console.log(`🎭 Table rendering: ${items.length} items (FULL)`);

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
  // STOP THE RENDER LOOP - only re-render when absolutely necessary
  
  // Core data changes
  if (prevProps.items.length !== nextProps.items.length) return false;
  if (prevProps.currentSegmentId !== nextProps.currentSegmentId) return false;
  
  // Selection state changes
  if (prevProps.selectedRows.size !== nextProps.selectedRows.size) return false;  
  if (prevProps.selectedRowId !== nextProps.selectedRowId) return false;
  
  // Drag state changes
  if (prevProps.draggedItemIndex !== nextProps.draggedItemIndex) return false;
  if (prevProps.dropTargetIndex !== nextProps.dropTargetIndex) return false;
  if (prevProps.isDraggingMultiple !== nextProps.isDraggingMultiple) return false;
  
  // UI state changes
  if (prevProps.showColorPicker !== nextProps.showColorPicker) return false;
  if (prevProps.hasClipboardData !== nextProps.hasClipboardData) return false;
  
  // Column state changes
  if (prevProps.visibleColumns.length !== nextProps.visibleColumns.length) return false;
  if (prevProps.columnExpandState !== nextProps.columnExpandState) return false;
  
  // REMOVE currentTime dependency - it changes constantly!
  // Skip re-render if none of the essential props changed
  return true;
});

export default RundownTable;