
import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import RundownRow from './RundownRow';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface VirtualizedRundownTableProps {
  items: RundownItem[];
  visibleColumns: Column[];
  height: number;
  rowHeight?: number;
  currentTime: Date;
  showColorPicker: string | null;
  selectedRows: Set<string>;
  currentSegmentId: string | null;
  getColumnWidth: (column: Column) => string;
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
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onJumpToHere?: (segmentId: string) => void;
}

const VirtualizedRundownTable = ({
  items,
  visibleColumns,
  height,
  rowHeight = 60,
  currentTime,
  showColorPicker,
  selectedRows,
  currentSegmentId,
  getColumnWidth,
  getRowNumber,
  getRowStatus,
  getHeaderDuration,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onToggleFloat,
  onRowSelect,
  onJumpToHere
}: VirtualizedRundownTableProps) => {
  
  // Memoized row renderer to prevent unnecessary re-renders
  const RowRenderer = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const item = items[index];
    if (!item) return null;

    const rowNumber = getRowNumber(index);
    const status = getRowStatus(item);
    const headerDuration = getHeaderDuration(index);
    const isSelected = selectedRows.has(item.id);
    const isCurrentlyPlaying = item.id === currentSegmentId;

    return (
      <div style={style}>
        <RundownRow
          item={item}
          index={index}
          rowNumber={rowNumber}
          status={status}
          showColorPicker={showColorPicker}
          cellRefs={{ current: {} }} // Optimized ref management handled elsewhere
          columns={visibleColumns}
          isSelected={isSelected}
          isCurrentlyPlaying={isCurrentlyPlaying}
          headerDuration={headerDuration}
          currentSegmentId={currentSegmentId}
          isDragging={false}
          onUpdateItem={onUpdateItem}
          onCellClick={onCellClick}
          onKeyDown={onKeyDown}
          onToggleColorPicker={onToggleColorPicker}
          onColorSelect={onColorSelect}
          onDeleteRow={onDeleteRow}
          onToggleFloat={onToggleFloat}
          onRowSelect={onRowSelect}
          onDragStart={() => {}}
          onDragOver={() => {}}
          onDrop={() => {}}
          onCopySelectedRows={() => {}}
          onDeleteSelectedRows={() => {}}
          onJumpToHere={onJumpToHere}
          getColumnWidth={getColumnWidth}
        />
      </div>
    );
  }, [
    items,
    visibleColumns,
    currentTime,
    showColorPicker,
    selectedRows,
    currentSegmentId,
    getColumnWidth,
    getRowNumber,
    getRowStatus,
    getHeaderDuration,
    onUpdateItem,
    onCellClick,
    onKeyDown,
    onToggleColorPicker,
    onColorSelect,
    onDeleteRow,
    onToggleFloat,
    onRowSelect,
    onJumpToHere
  ]);

  // Only render if we have items
  if (items.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground bg-background border border-border rounded">
        No items to display
      </div>
    );
  }

  return (
    <List
      height={height}
      itemCount={items.length}
      itemSize={rowHeight}
      overscanCount={5} // Render 5 extra items for smooth scrolling
    >
      {RowRenderer}
    </List>
  );
};

export default React.memo(VirtualizedRundownTable);
