
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

  // Use memoized calculations to avoid expensive recalculations
  const {
    itemsWithStatus,
    headerDurations,
    totalCalculatedRuntime
  } = useRundownMemoization(visibleItems, visibleColumns, currentSegmentId, startTime);

  // Enhanced drag handlers that understand header groups
  const handleEnhancedDragStart = React.useCallback((e: React.DragEvent, index: number) => {
    const item = visibleItems[index];
    console.log('🚀 Enhanced drag start for item:', item?.name, 'type:', item?.type);
    
    if (item?.type === 'header' && isHeaderCollapsed(item.id)) {
      console.log('🔗 Dragging collapsed header group for:', item.name);
      const groupIds = getHeaderGroupItemIds(item.id);
      console.log('📋 Group item IDs:', groupIds);
      
      // Pass group information through dataTransfer
      e.dataTransfer.setData('application/json', JSON.stringify({
        draggedIndex: index,
        isHeaderGroup: true,
        headerGroupIds: groupIds,
        originalItemsLength: items.length
      }));
    }
    
    if (onDragStart) {
      onDragStart(e, index);
    }
  }, [visibleItems, items, isHeaderCollapsed, getHeaderGroupItemIds, onDragStart]);

  // Create optimized getRowNumber function
  const getRowNumber = React.useCallback((index: number) => {
    if (index < 0 || index >= itemsWithStatus.length) return '';
    return itemsWithStatus[index]?.calculatedRowNumber || '';
  }, [itemsWithStatus]);

  // Create optimized getRowStatus function
  const getRowStatus = React.useCallback((item: any) => {
    const enhancedItem = itemsWithStatus.find(enhancedItem => enhancedItem.id === item.id);
    return enhancedItem?.calculatedStatus || 'upcoming';
  }, [itemsWithStatus]);

  // Create optimized getHeaderDuration function - use ORIGINAL items, not visible ones
  const getHeaderDuration = React.useCallback((index: number) => {
    if (index < 0 || index >= visibleItems.length) return '00:00:00';
    const visibleItem = visibleItems[index];
    
    // Find the original index in the full items array
    const originalIndex = items.findIndex(item => item.id === visibleItem.id);
    if (originalIndex === -1) return '00:00:00';
    
    return headerDurations.get(visibleItem.id) || '00:00:00';
  }, [items, visibleItems, headerDurations]);

  // Enhanced drop handler that processes header groups
  const handleEnhancedDrop = React.useCallback((e: React.DragEvent, dropIndex: number) => {
    console.log('🎯 Enhanced drop at index:', dropIndex);
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('application/json') || '{}');
      console.log('📋 Drag data:', dragData);
      
      if (dragData.isHeaderGroup && dragData.headerGroupIds) {
        console.log('🔗 Processing header group drop');
        // This is a header group - we need to handle it specially
        // For now, pass through to original handler but log for debugging
      }
    } catch (error) {
      console.log('⚠️ Could not parse drag data, using fallback');
    }
    
    if (onDrop) {
      onDrop(e, dropIndex);
    }
  }, [onDrop]);

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
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDragEnd={onDragEnd}
    />
  );
});

OptimizedRundownTableWrapper.displayName = 'OptimizedRundownTableWrapper';

export default OptimizedRundownTableWrapper;
