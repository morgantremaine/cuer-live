
import React, { useRef, useEffect } from 'react';
import VirtualizedRundownTable from './VirtualizedRundownTable';
import RundownTableHeader from './RundownTableHeader';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { useOptimizedCellRefs } from '@/hooks/useOptimizedCellRefs';

interface RundownContentProps {
  items: RundownItem[];
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  selectedRows: Set<string>;
  draggedItemIndex: number | null;
  isDraggingMultiple: boolean;
  dropTargetIndex: number | null;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  selectedRowId?: string | null;
  searchTerm?: string;
  searchResults?: { itemId: string; fieldKey: string; matchText: string }[];
  currentSearchIndex?: number;
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
  selectedRows,
  draggedItemIndex,
  isDraggingMultiple,
  dropTargetIndex,
  currentSegmentId,
  hasClipboardData = false,
  selectedRowId = null,
  searchTerm,
  searchResults,
  currentSearchIndex,
  autoScrollEnabled,
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

  // Use optimized cell refs to prevent memory leaks
  const { getCellRef, clearUnusedRefs, getAllRefs } = useOptimizedCellRefs();
  
  // Create a ref object with the correct type
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  
  // Update cellRefs.current with the actual refs
  useEffect(() => {
    cellRefs.current = getAllRefs();
  }, [getAllRefs]);

  // Cleanup unused refs periodically
  useEffect(() => {
    const activeKeys = items.flatMap(item => 
      visibleColumns.map(col => `${item.id}-${col.key}`)
    );
    clearUnusedRefs(activeKeys);
  }, [items, visibleColumns, clearUnusedRefs]);

  // Scroll to current search result
  const listRef = useRef<any>(null);
  useEffect(() => {
    if (searchResults && currentSearchIndex !== undefined && listRef.current) {
      const currentResult = searchResults[currentSearchIndex];
      if (currentResult) {
        const itemIndex = items.findIndex(item => item.id === currentResult.itemId);
        if (itemIndex !== -1) {
          listRef.current.scrollToItem(itemIndex, 'center');
        }
      }
    }
  }, [searchResults, currentSearchIndex, items]);

  return (
    <div className="relative bg-background h-full">
      <ScrollArea className="w-full h-full bg-background">
        <div className="min-w-max bg-background">
          {/* Sticky Header */}
          <div className="sticky top-0 z-20 bg-background border-b border-border">
            <table className="w-full border-collapse">
              <RundownTableHeader 
                visibleColumns={visibleColumns}
                getColumnWidth={getColumnWidth}
                updateColumnWidth={updateColumnWidth}
              />
            </table>
          </div>

          {/* Virtualized Table Content */}
          <VirtualizedRundownTable
            ref={listRef}
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
            searchTerm={searchTerm}
            searchResults={searchResults}
            currentSearchIndex={currentSearchIndex}
            getColumnWidth={getColumnWidth}
            updateColumnWidth={updateColumnWidth}
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
