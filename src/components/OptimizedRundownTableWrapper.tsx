import React, { memo } from 'react';
import RundownTable from './RundownTable';
import { useRundownMemoization } from '@/hooks/useRundownMemoization';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface OptimizedRundownTableWrapperProps {
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
  onJumpToHere?: (segmentId: string) => void;
  onMoveItemUp?: (index: number) => void;
  onMoveItemDown?: (index: number) => void;
  markActiveTyping?: () => void;
  // Header collapse functions (to ensure same state as drag system)
  toggleHeaderCollapse: (headerId: string) => void;
  isHeaderCollapsed: (headerId: string) => boolean;
  getHeaderGroupItemIds: (headerId: string) => string[];
  visibleItems: RundownItem[];
}

const OptimizedRundownTableWrapper: React.FC<OptimizedRundownTableWrapperProps> = ({
  items,
  visibleColumns,
  startTime,
  currentSegmentId,
  columnExpandState,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  // Extract header collapse functions from props
  toggleHeaderCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds,
  visibleItems,
  ...restProps
}) => {
  // Use memoized calculations - use ORIGINAL items for correct calculations
  const {
    itemsWithStatus,
    headerDurations,
    totalCalculatedRuntime
  } = useRundownMemoization(items, visibleColumns, currentSegmentId, startTime);

  // Map visible item indexes to original item indexes
  const getOriginalIndex = React.useCallback((visibleIndex: number): number => {
    if (visibleIndex < 0 || visibleIndex >= visibleItems.length) return -1;
    const visibleItem = visibleItems[visibleIndex];
    return items.findIndex(item => item.id === visibleItem.id);
  }, [items, visibleItems]);

  // Map original item indexes to visible item indexes (for drop indicator)
  const getVisibleIndex = React.useCallback((originalIndex: number): number => {
    if (originalIndex < 0 || originalIndex >= items.length) return -1;
    const originalItem = items[originalIndex];
    return visibleItems.findIndex(item => item.id === originalItem.id);
  }, [items, visibleItems]);

  // Enhanced drag start that maps visible to original indexes AND handles header groups
  const handleEnhancedDragStart = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    const originalIndex = getOriginalIndex(visibleIndex);
    
    if (originalIndex === -1) {
      return;
    }
    
    const item = items[originalIndex];
    
    // No need for auto-selection since drag system now uses same header collapse state
    if (item?.type === 'header' && isHeaderCollapsed(item.id)) {
      // Collapsed header group will be detected automatically by the drag system
    }
    
    // Call the original handler which will handle the collapsed header logic
    if (onDragStart) {
      onDragStart(e, originalIndex);
    }
  }, [getOriginalIndex, items, isHeaderCollapsed, onDragStart, restProps.selectedRows]);

  // Enhanced drop that maps visible to original indexes  
  const handleEnhancedDrop = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    const originalIndex = getOriginalIndex(visibleIndex);
    
    if (originalIndex === -1) {
      return;
    }
    
    if (onDrop) {
      onDrop(e, originalIndex);
    }
  }, [getOriginalIndex, onDrop]);

  // Enhanced row select that maps visible to original indexes
  const handleEnhancedRowSelect = React.useCallback((itemId: string, visibleIndex: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => {
    const originalIndex = getOriginalIndex(visibleIndex);
    
    if (originalIndex === -1) {
      return;
    }
    
    if (restProps.onRowSelect) {
      restProps.onRowSelect(itemId, originalIndex, isShiftClick, isCtrlClick, headerGroupItemIds);
    }
  }, [getOriginalIndex, restProps.onRowSelect]);

  // Enhanced drag over that maps visible to original indexes
  const handleEnhancedDragOver = React.useCallback((e: React.DragEvent, visibleIndex?: number) => {
    if (visibleIndex !== undefined) {
      const originalIndex = getOriginalIndex(visibleIndex);
      if (originalIndex !== -1 && onDragOver) {
        onDragOver(e, originalIndex);
      }
    } else {
      if (onDragOver) {
        onDragOver(e);
      }
    }
  }, [getOriginalIndex, onDragOver]);

  // Create optimized getRowNumber function
  const getRowNumber = React.useCallback((index: number) => {
    if (index < 0 || index >= visibleItems.length) return '';
    const visibleItem = visibleItems[index];
    // Find the corresponding item in itemsWithStatus
    const enhancedItem = itemsWithStatus.find(item => item.id === visibleItem.id);
    return enhancedItem?.calculatedRowNumber || '';
  }, [visibleItems, itemsWithStatus]);

  // Create optimized getRowStatus function
  const getRowStatus = React.useCallback((item: any) => {
    const enhancedItem = itemsWithStatus.find(enhancedItem => enhancedItem.id === item.id);
    return enhancedItem?.calculatedStatus || 'upcoming';
  }, [itemsWithStatus]);

  // Create optimized getHeaderDuration function - use ORIGINAL items for calculation
  const getHeaderDuration = React.useCallback((index: number) => {
    if (index < 0 || index >= visibleItems.length) return '00:00:00';
    const visibleItem = visibleItems[index];
    return headerDurations.get(visibleItem.id) || '00:00:00';
  }, [visibleItems, headerDurations]);

  return (
    <RundownTable
      {...restProps}
      items={visibleItems}
      visibleColumns={visibleColumns}
      currentSegmentId={currentSegmentId}
      columnExpandState={columnExpandState}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      getHeaderDuration={getHeaderDuration}
      onToggleHeaderCollapse={toggleHeaderCollapse}
      isHeaderCollapsed={isHeaderCollapsed}
      getHeaderGroupItemIds={getHeaderGroupItemIds}
      onMoveItemUp={restProps.onMoveItemUp}
      onMoveItemDown={restProps.onMoveItemDown}
      markActiveTyping={restProps.markActiveTyping}
      onRowSelect={(itemId, visibleIndex, isShiftClick, isCtrlClick, passedHeaderGroupItemIds) => {
        // Map visible index to original index first
        const originalIndex = getOriginalIndex(visibleIndex);
        if (originalIndex === -1) return;
        
        // Use OUR header collapse functions, not the passed ones
        let actualHeaderGroupItemIds = passedHeaderGroupItemIds;
        const item = visibleItems[visibleIndex];
        
        if (item?.type === 'header') {
          const collapsed = isHeaderCollapsed(item.id);
          
          if (collapsed) {
            actualHeaderGroupItemIds = getHeaderGroupItemIds(item.id);
          }
        }
        if (restProps.onRowSelect) {
          restProps.onRowSelect(itemId, originalIndex, isShiftClick, isCtrlClick, actualHeaderGroupItemIds);
        }
      }}
      onDragStart={handleEnhancedDragStart}
      onDrop={handleEnhancedDrop}
      onDragOver={handleEnhancedDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
      // Map dropTargetIndex from original space to visible space
      dropTargetIndex={restProps.dropTargetIndex !== null ? getVisibleIndex(restProps.dropTargetIndex) : null}
      draggedItemIndex={restProps.draggedItemIndex !== null ? getVisibleIndex(restProps.draggedItemIndex) : null}
    />
  );
};

// Custom comparison function to ensure re-renders when items change
OptimizedRundownTableWrapper.displayName = 'OptimizedRundownTableWrapper';

export default OptimizedRundownTableWrapper;