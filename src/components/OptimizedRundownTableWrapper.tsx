
import React, { memo } from 'react';
import RundownTable from './RundownTable';
import { useRundownMemoization } from '@/hooks/useRundownMemoization';
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
  ...restProps
}) => {
  // Use memoized calculations to avoid expensive recalculations
  const {
    itemsWithStatus,
    headerDurations,
    totalCalculatedRuntime
  } = useRundownMemoization(items, visibleColumns, currentSegmentId, startTime);

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

  // Create optimized getHeaderDuration function
  const getHeaderDuration = React.useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '00:00:00';
    const item = items[index];
    return headerDurations.get(item.id) || '00:00:00';
  }, [items, headerDurations]);

  return (
    <RundownTable
      {...restProps}
      items={items}
      visibleColumns={visibleColumns}
      currentSegmentId={currentSegmentId}
      getRowNumber={getRowNumber}
      getRowStatus={getRowStatus}
      getHeaderDuration={getHeaderDuration}
    />
  );
});

OptimizedRundownTableWrapper.displayName = 'OptimizedRundownTableWrapper';

export default OptimizedRundownTableWrapper;
