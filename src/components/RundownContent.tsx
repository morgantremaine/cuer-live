
import React from 'react';
import RundownTable from './RundownTable';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';

interface RundownContentProps {
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
  selectedRowId?: string | null;
  isPlaying?: boolean;
  autoScrollEnabled?: boolean;
  onToggleAutoScroll?: () => void;
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
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

const RundownContent = ({
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
  selectedRowId = null,
  isPlaying = false,
  autoScrollEnabled = false,
  onToggleAutoScroll,
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
  onAddRow,
  onAddHeader,
  onJumpToHere
}: RundownContentProps) => {

  // Debug autoscroll props
  console.log('🔄 RundownContent: Autoscroll debug:', {
    autoScrollEnabled,
    currentSegmentId,
    isPlaying,
    itemCount: items.length,
    hasToggleFunction: !!onToggleAutoScroll
  });

  // Initialize autoscroll functionality with enhanced debugging
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items
  });

  return (
    <div className="relative bg-background h-full">
      {/* Scrollable Content with Header Inside */}
      <ScrollArea className="w-full h-full bg-background" ref={scrollContainerRef}>
        <div className="min-w-max bg-background">
          {/* Sticky Header - Inside ScrollArea */}
          <div className="sticky top-0 z-20 bg-background border-b border-border">
            <table className="w-full border-collapse">
              <RundownTableHeader 
                visibleColumns={visibleColumns}
                getColumnWidth={getColumnWidth}
                updateColumnWidth={updateColumnWidth}
              />
            </table>
          </div>

          {/* Table Content */}
          <RundownTable
            items={items}
            visibleColumns={visibleColumns}
            currentTime={currentTime}
            showColorPicker={showColorPicker}
            cellRefs={cellRefs}
            selectedRows={selectedRows}
            draggedItemIndex={draggedItemIndex}
            isDraggingMultiple={isDraggingMultiple}
            dropTargetIndex={dropTargetIndex}
            currentSegmentId={currentSegmentId}
            hasClipboardData={hasClipboardData}
            selectedRowId={selectedRowId}
            getColumnWidth={getColumnWidth}
            updateColumnWidth={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
            getRowNumber={getRowNumber}
            getRowStatus={(item) => getRowStatus(item, currentTime)}
            getHeaderDuration={calculateHeaderDuration}
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
            onPasteRows={onPasteRows || (() => {})}
            onClearSelection={onClearSelection || (() => {})}
            onAddRow={onAddRow || (() => {})}
            onAddHeader={onAddHeader || (() => {})}
            onJumpToHere={onJumpToHere}
          />
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
};

export default RundownContent;
