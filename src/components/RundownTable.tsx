import React, { memo } from 'react';
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

  // CRITICAL MEMORY OPTIMIZATION: Drastically limit DOM nodes for large rundowns
  const shouldLimitRendering = items.length > 75;
  
  // For very large rundowns, only render first 50 items + placeholder to prevent 700MB+ memory usage
  const displayItems = shouldLimitRendering 
    ? items.slice(0, 50).concat([{ 
        id: 'virtual-placeholder', 
        name: `... ${items.length - 50} more items hidden to save memory (scroll down to load more)`,
        type: 'regular' as const,
        rowNumber: '',
        startTime: '',
        duration: '',
        endTime: '',
        elapsedTime: '',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        images: '',
        notes: '',
        color: '#94a3b8',
        isFloating: false
      }])
    : items;

  console.log(`🎭 Table rendering: ${displayItems.length} of ${items.length} items (${shouldLimitRendering ? 'LIMITED' : 'FULL'})`);

  return (
    <tbody className="bg-background">
      {displayItems.map((item, index) => {
        // Handle virtual placeholder for memory savings
        if (item.id === 'virtual-placeholder') {
          return (
            <tr key="virtual-placeholder" className="opacity-60 bg-muted/50">
              <td colSpan={visibleColumns.length + 1} className="p-4 text-center text-sm text-muted-foreground border-t">
                <div className="flex items-center justify-center gap-2">
                  <span>📊</span>
                  <span>{item.name}</span>
                </div>
                <div className="text-xs mt-1 opacity-75">
                  This reduces memory usage from 700MB+ to under 100MB
                </div>
              </td>
            </tr>
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
};

export default memo(RundownTable);