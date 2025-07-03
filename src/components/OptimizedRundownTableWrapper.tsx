import React, { memo } from 'react';
import RundownTable from './RundownTable';
import { useRundownMemoization } from '@/hooks/useRundownMemoization';
import { useHeaderCollapse } from '@/hooks/useHeaderCollapse';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

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
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
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
}

const OptimizedRundownTableWrapper = memo<OptimizedRundownTableWrapperProps>(({
  items,
  visibleColumns,
  startTime,
  currentSegmentId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  ...restProps
}) => {
  // Use header collapse functionality
  const {
    visibleItems,
    toggleHeaderCollapse,
    isHeaderCollapsed,
    getHeaderGroupItemIds
  } = useHeaderCollapse(items);

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

  // Enhanced drag start that maps visible to original indexes
  const handleEnhancedDragStart = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    const originalIndex = getOriginalIndex(visibleIndex);
    console.log('🚀 Enhanced drag start - visibleIndex:', visibleIndex, 'originalIndex:', originalIndex);
    
    if (originalIndex === -1) {
      console.error('❌ Could not map visible index to original index');
      return;
    }
    
    if (onDragStart) {
      onDragStart(e, originalIndex);
    }
  }, [getOriginalIndex, onDragStart]);

  // Enhanced drop that maps visible to original indexes  
  const handleEnhancedDrop = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    const originalIndex = getOriginalIndex(visibleIndex);
    console.log('🎯 Enhanced drop - visibleIndex:', visibleIndex, 'originalIndex:', originalIndex);
    
    if (originalIndex === -1) {
      console.error('❌ Could not map visible index to original index for drop');
      return;
    }
    
    if (onDrop) {
      onDrop(e, originalIndex);
    }
  }, [getOriginalIndex, onDrop]);

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
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      getHeaderDuration={getHeaderDuration}
      onToggleHeaderCollapse={toggleHeaderCollapse}
      isHeaderCollapsed={isHeaderCollapsed}
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
});

OptimizedRundownTableWrapper.displayName = 'OptimizedRundownTableWrapper';

export default OptimizedRundownTableWrapper;