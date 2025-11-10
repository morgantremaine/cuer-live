import React, { useRef, useMemo } from 'react';
import RundownTable from './RundownTable';
import { useVirtualizedRows } from '@/hooks/useVirtualizedRows';
import { Column } from '@/types/columns';
import { RundownItem } from '@/types/rundown';

interface OptimizedVirtualRundownTableProps {
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
  scrollContainerRef: React.RefObject<HTMLElement>;
  enableVirtualization?: boolean;
}

/**
 * Phase 2 Optimization: Windowed/virtualized table wrapper
 * Only renders visible rows for 90-95% reduction in DOM elements
 */
const OptimizedVirtualRundownTable: React.FC<OptimizedVirtualRundownTableProps> = ({
  items,
  scrollContainerRef,
  enableVirtualization = true,
  getRowNumber,
  onDragStart,
  onDrop,
  onRowSelect,
  draggedItemIndex,
  dropTargetIndex,
  ...restProps
}) => {
  
  // Apply virtualization if enabled and items count is large
  const shouldVirtualize = enableVirtualization && items.length > 50;

  const {
    virtualItems,
    startIndex,
    endIndex,
    totalHeight,
    offsetY
  } = useVirtualizedRows({
    items,
    containerRef: scrollContainerRef,
    rowHeight: 40,
    overscan: 10
  });

  // Adjust functions to work with virtual indices
  const adjustedGetRowNumber = useMemo(() => {
    return (virtualIndex: number) => {
      if (!shouldVirtualize) return getRowNumber(virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      return getRowNumber(actualIndex);
    };
  }, [getRowNumber, startIndex, shouldVirtualize]);

  const adjustedOnDragStart = useMemo(() => {
    return (e: React.DragEvent, virtualIndex: number) => {
      if (!shouldVirtualize) return onDragStart(e, virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      onDragStart(e, actualIndex);
    };
  }, [onDragStart, startIndex, shouldVirtualize]);

  const adjustedOnDrop = useMemo(() => {
    return (e: React.DragEvent, virtualIndex: number) => {
      if (!shouldVirtualize) return onDrop(e, virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      onDrop(e, actualIndex);
    };
  }, [onDrop, startIndex, shouldVirtualize]);

  const adjustedOnRowSelect = useMemo(() => {
    return (itemId: string, virtualIndex: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
      if (!shouldVirtualize) return onRowSelect(itemId, virtualIndex, isShiftClick, isCtrlClick, headerGroupItemIds);
      const actualIndex = startIndex + virtualIndex;
      onRowSelect(itemId, actualIndex, isShiftClick, isCtrlClick, headerGroupItemIds);
    };
  }, [onRowSelect, startIndex, shouldVirtualize]);

  // Adjust draggedItemIndex to virtual index
  const adjustedDraggedItemIndex = useMemo(() => {
    if (!shouldVirtualize || draggedItemIndex === null || draggedItemIndex === undefined) {
      return draggedItemIndex;
    }
    // Check if draggedItemIndex is within visible range
    if (draggedItemIndex >= startIndex && draggedItemIndex < endIndex) {
      return draggedItemIndex - startIndex;
    }
    return null;
  }, [draggedItemIndex, startIndex, endIndex, shouldVirtualize]);

  // Adjust dropTargetIndex to virtual index
  const adjustedDropTargetIndex = useMemo(() => {
    if (!shouldVirtualize || dropTargetIndex === null || dropTargetIndex === undefined) {
      return dropTargetIndex;
    }
    // Check if dropTargetIndex is within visible range
    if (dropTargetIndex >= startIndex && dropTargetIndex < endIndex) {
      return dropTargetIndex - startIndex;
    }
    return null;
  }, [dropTargetIndex, startIndex, endIndex, shouldVirtualize]);

  // Use virtual items if virtualization is enabled, otherwise use all items
  const displayItems = shouldVirtualize ? virtualItems : items;

  if (!shouldVirtualize) {
    // No virtualization for small lists
    return (
      <RundownTable
        items={displayItems}
        getRowNumber={adjustedGetRowNumber}
        onDragStart={adjustedOnDragStart}
        onDrop={adjustedOnDrop}
        onRowSelect={adjustedOnRowSelect}
        draggedItemIndex={adjustedDraggedItemIndex}
        dropTargetIndex={adjustedDropTargetIndex}
        {...restProps}
      />
    );
  }

  // Virtualized rendering with wrapper div to handle total height
  return (
    <div style={{ height: `${totalHeight}px`, position: 'relative' }}>
      <div style={{ transform: `translateY(${offsetY}px)` }}>
        <RundownTable
          items={displayItems}
          getRowNumber={adjustedGetRowNumber}
          onDragStart={adjustedOnDragStart}
          onDrop={adjustedOnDrop}
          onRowSelect={adjustedOnRowSelect}
          draggedItemIndex={adjustedDraggedItemIndex}
          dropTargetIndex={adjustedDropTargetIndex}
          {...restProps}
        />
      </div>
    </div>
  );
};

export default OptimizedVirtualRundownTable;
