
import React, { useState, useCallback } from 'react';
import OptimizedRundownTableWrapper from './OptimizedRundownTableWrapper';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { useRundownAutoscroll } from '@/hooks/useRundownAutoscroll';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';

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
  startTime?: string;
  onToggleAutoScroll?: () => void;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
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
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (itemId: string) => void;
}

const RundownContent = React.memo<RundownContentProps>(({
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
  startTime = '00:00:00',
  onToggleAutoScroll,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns,
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
  onDragEnd,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere
}) => {
  // Column expand state for script and notes columns
  const [columnExpandState, setColumnExpandState] = useState<{ [columnKey: string]: boolean }>({});

  // Toggle column expand state
  const handleToggleColumnExpand = useCallback((columnKey: string) => {
    setColumnExpandState(prev => ({
      ...prev,
      [columnKey]: !prev[columnKey]
    }));
  }, []);

  // Initialize autoscroll functionality
  const { scrollContainerRef } = useRundownAutoscroll({
    currentSegmentId,
    isPlaying,
    autoScrollEnabled,
    items
  });

  // Initialize drag auto-scroll functionality
  const isDragging = draggedItemIndex !== null;
  const { handleDragAutoScroll } = useDragAutoScroll({
    scrollContainerRef,
    isActive: isDragging
  });

  // Enhanced drag over handler that includes auto-scroll
  const handleEnhancedDragOver = React.useCallback((e: React.DragEvent, index?: number) => {
    // Handle auto-scroll first
    handleDragAutoScroll(e);
    // Then handle regular drag over logic
    onDragOver(e, index);
  }, [handleDragAutoScroll, onDragOver]);

  // Calculate total table width to ensure proper sizing
  const totalTableWidth = React.useMemo(() => {
    let total = 64; // Row number column width
    visibleColumns.forEach(column => {
      const width = getColumnWidth(column);
      const widthValue = parseInt(width.replace('px', ''));
      total += widthValue;
    });
    return total;
  }, [visibleColumns, getColumnWidth]);

  return (
    <div className="bg-background h-full">
      {/* Scrollable Content with Header Inside */}
      <ScrollArea className="w-full h-full bg-background" ref={scrollContainerRef}>
        <div className="bg-background" style={{ minWidth: `${totalTableWidth}px` }}>
          {/* Single Table Structure for Perfect Alignment */}
          <table className="border-collapse" style={{ 
            tableLayout: 'fixed', 
            width: `${totalTableWidth}px`,
            minWidth: `${totalTableWidth}px`,
            margin: 0,
            padding: 0
          }}>
            {/* Sticky Header */}
            <RundownTableHeader 
              visibleColumns={visibleColumns}
              getColumnWidth={getColumnWidth}
              updateColumnWidth={updateColumnWidth}
              onReorderColumns={onReorderColumns}
              items={items}
              columnExpandState={columnExpandState}
              onToggleColumnExpand={handleToggleColumnExpand}
            />
            
            {/* Table Body - Content */}
            <OptimizedRundownTableWrapper
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
            startTime={startTime}
            columnExpandState={columnExpandState}
            getColumnWidth={getColumnWidth}
            updateColumnWidth={updateColumnWidth}
            onUpdateItem={onUpdateItem}
            onCellClick={onCellClick}
            onKeyDown={onKeyDown}
            onToggleColorPicker={onToggleColorPicker}
            onColorSelect={onColorSelect}
            onDeleteRow={onDeleteRow}
            onToggleFloat={onToggleFloat}
            onRowSelect={onRowSelect}
            onDragStart={onDragStart}
            onDragOver={handleEnhancedDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onDragEnd={onDragEnd}
            onCopySelectedRows={onCopySelectedRows}
            onDeleteSelectedRows={onDeleteSelectedRows}
            onPasteRows={onPasteRows || (() => {})}
            onClearSelection={onClearSelection || (() => {})}
            onAddRow={onAddRow || (() => {})}
            onAddHeader={onAddHeader || (() => {})}
            onJumpToHere={onJumpToHere}
            />
          </table>
        </div>
        <ScrollBar orientation="horizontal" />
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  );
});

RundownContent.displayName = 'RundownContent';

export default RundownContent;
