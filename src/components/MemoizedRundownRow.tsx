import React, { memo } from 'react';
import RundownRow from './RundownRow';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface MemoizedRundownRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  headerDuration?: string;
  isSelected: boolean;
  isDragging: boolean;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  hasClipboardData?: boolean;
  columnExpandState?: { [columnKey: string]: boolean };
  getColumnWidth: (column: Column) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat?: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  markActiveTyping?: () => void;
  onToggleCollapse?: (headerId: string) => void;
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
}

// Aggressive memoization to prevent unnecessary re-renders
const MemoizedRundownRow = memo<MemoizedRundownRowProps>(({
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  headerDuration,
  isSelected,
  isDragging,
  isCurrentlyPlaying,
  isDraggingMultiple,
  hasClipboardData,
  columnExpandState,
  getColumnWidth,
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
  onDrop,
  onDragEnd,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  markActiveTyping,
  onToggleCollapse,
  isHeaderCollapsed,
  getHeaderGroupItemIds
}) => {
  return (
    <RundownRow
      item={item}
      index={index}
      rowNumber={rowNumber}
      status={status}
      showColorPicker={showColorPicker}
      cellRefs={cellRefs}
      columns={columns}
      headerDuration={headerDuration}
      isSelected={isSelected}
      isDragging={isDragging}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isDraggingMultiple={isDraggingMultiple}
      hasClipboardData={hasClipboardData}
      columnExpandState={columnExpandState}
      getColumnWidth={getColumnWidth}
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
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onCopySelectedRows={onCopySelectedRows}
      onDeleteSelectedRows={onDeleteSelectedRows}
      onPasteRows={onPasteRows}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      onJumpToHere={onJumpToHere}
      markActiveTyping={markActiveTyping}
      onToggleCollapse={onToggleCollapse}
      isHeaderCollapsed={isHeaderCollapsed}
      getHeaderGroupItemIds={getHeaderGroupItemIds}
    />
  );
}, (prevProps, nextProps) => {
  // Custom comparison function for aggressive memoization
  // Only re-render if specific props that affect this row have changed
  
  // CRITICAL: Check ALL editable fields that users can type in
  if (prevProps.item.id !== nextProps.item.id) return false;
  if (prevProps.item.name !== nextProps.item.name) return false;
  if (prevProps.item.color !== nextProps.item.color) return false;
  if (prevProps.item.type !== nextProps.item.type) return false;
  
  // CHECK ALL EDITABLE FIELDS - this was missing and causing typing issues!
  if (prevProps.item.duration !== nextProps.item.duration) return false;
  if (prevProps.item.script !== nextProps.item.script) return false;
  if (prevProps.item.notes !== nextProps.item.notes) return false;
  if (prevProps.item.talent !== nextProps.item.talent) return false;
  if (prevProps.item.gfx !== nextProps.item.gfx) return false;
  if (prevProps.item.video !== nextProps.item.video) return false;
  if (prevProps.item.images !== nextProps.item.images) return false;
  if (prevProps.item.startTime !== nextProps.item.startTime) return false;
  if (prevProps.item.endTime !== nextProps.item.endTime) return false;
  if (prevProps.item.isFloating !== nextProps.item.isFloating) return false;
  if (prevProps.item.isFloated !== nextProps.item.isFloated) return false;
  
  // Check any custom fields that might exist
  const prevCustomFields = Object.keys(prevProps.item).filter(key => 
    !['id', 'name', 'color', 'type', 'duration', 'script', 'notes', 'talent', 'gfx', 'video', 'images', 'startTime', 'endTime', 'isFloating', 'isFloated', 'rowNumber', 'elapsedTime', 'customFields', 'segmentName', 'status', 'isHeader'].includes(key)
  );
  const nextCustomFields = Object.keys(nextProps.item).filter(key => 
    !['id', 'name', 'color', 'type', 'duration', 'script', 'notes', 'talent', 'gfx', 'video', 'images', 'startTime', 'endTime', 'isFloating', 'isFloated', 'rowNumber', 'elapsedTime', 'customFields', 'segmentName', 'status', 'isHeader'].includes(key)
  );
  
  if (prevCustomFields.length !== nextCustomFields.length) return false;
  for (const field of prevCustomFields) {
    if (prevProps.item[field] !== nextProps.item[field]) return false;
  }
  
  // Selection and interaction state
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.isDragging !== nextProps.isDragging) return false;
  if (prevProps.isCurrentlyPlaying !== nextProps.isCurrentlyPlaying) return false;
  if (prevProps.showColorPicker !== nextProps.showColorPicker) return false;
  
  // Row metadata
  if (prevProps.rowNumber !== nextProps.rowNumber) return false;
  if (prevProps.status !== nextProps.status) return false;
  if (prevProps.headerDuration !== nextProps.headerDuration) return false;
  
  // Global state that affects rendering
  if (prevProps.isDraggingMultiple !== nextProps.isDraggingMultiple) return false;
  if (prevProps.hasClipboardData !== nextProps.hasClipboardData) return false;
  
  // Column expansion state - only check if this item is a header
  if (nextProps.item.type === 'header' && prevProps.columnExpandState !== nextProps.columnExpandState) {
    return false;
  }
  
  // If none of the important props changed, skip re-render
  return true;
});

MemoizedRundownRow.displayName = 'MemoizedRundownRow';

export default MemoizedRundownRow;