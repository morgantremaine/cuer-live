import React, { useMemo } from 'react';
import RundownTable from './RundownTable';
import { Column } from '@/types/columns';

interface OptimizedVirtualRundownTableProps {
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
  // Virtualization props passed from parent
  startIndex?: number;
  endIndex?: number;
  // Per-cell editor indicators
  getEditorForCell?: (itemId: string, field: string) => { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
}

/**
 * Phase 2 Optimization: Index adjustment wrapper for virtualized table
 * Adjusts indices to work with virtual window when parent handles virtualization
 */
const OptimizedVirtualRundownTable: React.FC<OptimizedVirtualRundownTableProps> = ({
  items,
  fullItems,
  getRowNumber,
  onDragStart,
  onDrop,
  onRowSelect,
  draggedItemIndex,
  dropTargetIndex,
  startIndex = 0,
  endIndex = items.length,
  ...restProps
}) => {
  // Use fullItems for selection logic, items for rendering
  const itemsForSelection = fullItems || items;
  
  // Check if we're in virtualization mode (parent passed indices)
  const isVirtualized = startIndex > 0 || endIndex < items.length;

  // Adjust functions to work with virtual indices
  const adjustedGetRowNumber = useMemo(() => {
    return (virtualIndex: number) => {
      if (!isVirtualized) return getRowNumber(virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      return getRowNumber(actualIndex);
    };
  }, [getRowNumber, startIndex, isVirtualized]);

  const adjustedOnDragStart = useMemo(() => {
    return (e: React.DragEvent, virtualIndex: number) => {
      if (!isVirtualized) return onDragStart(e, virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      onDragStart(e, actualIndex);
    };
  }, [onDragStart, startIndex, isVirtualized]);

  const adjustedOnDrop = useMemo(() => {
    return (e: React.DragEvent, virtualIndex: number) => {
      if (!isVirtualized) return onDrop(e, virtualIndex);
      const actualIndex = startIndex + virtualIndex;
      onDrop(e, actualIndex);
    };
  }, [onDrop, startIndex, isVirtualized]);

  const adjustedOnRowSelect = useMemo(() => {
    return (itemId: string, virtualIndex: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
      // Find the actual index in the full items array by item ID
      const actualIndex = itemsForSelection.findIndex(item => item.id === itemId);
      if (actualIndex === -1) {
        console.warn('Could not find item in full items array:', itemId);
        return;
      }
      onRowSelect(itemId, actualIndex, isShiftClick, isCtrlClick, headerGroupItemIds);
    };
  }, [onRowSelect, itemsForSelection]);

  // Adjust draggedItemIndex to virtual index
  const adjustedDraggedItemIndex = useMemo(() => {
    if (!isVirtualized || draggedItemIndex === null || draggedItemIndex === undefined) {
      return draggedItemIndex;
    }
    // Check if draggedItemIndex is within visible range
    if (draggedItemIndex >= startIndex && draggedItemIndex < endIndex) {
      return draggedItemIndex - startIndex;
    }
    return null;
  }, [draggedItemIndex, startIndex, endIndex, isVirtualized]);

  // Adjust dropTargetIndex to virtual index
  const adjustedDropTargetIndex = useMemo(() => {
    if (!isVirtualized || dropTargetIndex === null || dropTargetIndex === undefined) {
      return dropTargetIndex;
    }
    // Check if dropTargetIndex is within visible range
    if (dropTargetIndex >= startIndex && dropTargetIndex < endIndex) {
      return dropTargetIndex - startIndex;
    }
    return null;
  }, [dropTargetIndex, startIndex, endIndex, isVirtualized]);

  // No wrapper divs - just return the table body
  return (
    <RundownTable
      items={items}
      fullItems={itemsForSelection}
      getRowNumber={adjustedGetRowNumber}
      onDragStart={adjustedOnDragStart}
      onDrop={adjustedOnDrop}
      onRowSelect={adjustedOnRowSelect}
      draggedItemIndex={adjustedDraggedItemIndex}
      dropTargetIndex={adjustedDropTargetIndex}
      {...restProps}
    />
  );
};

export default OptimizedVirtualRundownTable;
