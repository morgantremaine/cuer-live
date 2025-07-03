
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
  onRowSelect,
  draggedItemIndex,
  dropTargetIndex,
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

  // SIMPLIFIED: Work with visible items directly, no complex index mapping
  // All drag operations now work with visible item indexes and the drag handler
  // will map them back to original indexes when needed

  // Enhanced row select that maps visible to original indexes
  const handleRowSelect = React.useCallback((itemId: string, visibleIndex: number, isShiftClick: boolean, isCtrlClick: boolean) => {
    // Find the original index of this item
    const originalIndex = items.findIndex(item => item.id === itemId);
    
    console.log('🎯 Row select - visibleIndex:', visibleIndex, 'originalIndex:', originalIndex, 'itemId:', itemId);
    
    if (originalIndex !== -1 && onRowSelect) {
      onRowSelect(itemId, originalIndex, isShiftClick, isCtrlClick);
    }
  }, [items, onRowSelect]);

  // Enhanced drag start that provides header group functionality
  const handleEnhancedDragStart = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    // Find the original index of the dragged item
    const visibleItem = visibleItems[visibleIndex];
    const originalIndex = items.findIndex(item => item.id === visibleItem.id);
    
    console.log('🚀 Enhanced drag start - visibleIndex:', visibleIndex, 'originalIndex:', originalIndex, 'item:', visibleItem.name);
    
    if (originalIndex !== -1) {
      // Let the main drag handler process this with the original index
      onDragStart(e, originalIndex);
    }
  }, [visibleItems, items, onDragStart]);

  // Enhanced drop that maps visible to original indexes  
  const handleEnhancedDrop = React.useCallback((e: React.DragEvent, visibleIndex: number) => {
    // Find the original index for the drop target
    const visibleItem = visibleItems[visibleIndex];
    const originalIndex = items.findIndex(item => item.id === visibleItem.id);
    
    console.log('🎯 Enhanced drop - visibleIndex:', visibleIndex, 'originalIndex:', originalIndex);
    
    if (originalIndex !== -1 && onDrop) {
      onDrop(e, originalIndex);
    }
  }, [visibleItems, items, onDrop]);

  // Enhanced drag over that maps visible to original indexes
  const handleEnhancedDragOver = React.useCallback((e: React.DragEvent, visibleIndex?: number) => {
    if (visibleIndex !== undefined) {
      const visibleItem = visibleItems[visibleIndex];
      const originalIndex = items.findIndex(item => item.id === visibleItem.id);
      
      if (originalIndex !== -1 && onDragOver) {
        onDragOver(e, originalIndex);
      }
    } else {
      if (onDragOver) {
        onDragOver(e);
      }
    }
  }, [visibleItems, items, onDragOver]);

  // Create optimized getRowNumber function
  const getRowNumber = React.useCallback((index: number) => {
    if (index < 0 || index >= visibleItems.length) return '';
    const visibleItem = visibleItems[index];
    const enhancedItem = itemsWithStatus.find(item => item.id === visibleItem.id);
    return enhancedItem?.calculatedRowNumber || '';
  }, [visibleItems, itemsWithStatus]);

  // Create optimized getRowStatus function
  const getRowStatus = React.useCallback((item: any) => {
    const enhancedItem = itemsWithStatus.find(enhancedItem => enhancedItem.id === item.id);
    return enhancedItem?.calculatedStatus || 'upcoming';
  }, [itemsWithStatus]);

  // Create optimized getHeaderDuration function
  const getHeaderDuration = React.useCallback((index: number) => {
    if (index < 0 || index >= visibleItems.length) return '00:00:00';
    const visibleItem = visibleItems[index];
    return headerDurations.get(visibleItem.id) || '00:00:00';
  }, [visibleItems, headerDurations]);

  // Map drop target index from original space to visible space for display
  const visibleDropTargetIndex = React.useMemo(() => {
    if (dropTargetIndex === null) return null;
    
    // If dropping at the end
    if (dropTargetIndex >= items.length) {
      return visibleItems.length;
    }
    
    // Find which visible item corresponds to the original drop target
    const targetItem = items[dropTargetIndex];
    if (!targetItem) return null;
    
    const visibleIndex = visibleItems.findIndex(item => item.id === targetItem.id);
    return visibleIndex !== -1 ? visibleIndex : null;
  }, [dropTargetIndex, items, visibleItems]);

  // Map dragged item index from original space to visible space for display
  const visibleDraggedItemIndex = React.useMemo(() => {
    if (draggedItemIndex === null) return null;
    
    const draggedItem = items[draggedItemIndex];
    if (!draggedItem) return null;
    
    const visibleIndex = visibleItems.findIndex(item => item.id === draggedItem.id);
    return visibleIndex !== -1 ? visibleIndex : null;
  }, [draggedItemIndex, items, visibleItems]);

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
      onRowSelect={handleRowSelect}
      dropTargetIndex={visibleDropTargetIndex}
      draggedItemIndex={visibleDraggedItemIndex}
    />
  );
});

OptimizedRundownTableWrapper.displayName = 'OptimizedRundownTableWrapper';

export default OptimizedRundownTableWrapper;
