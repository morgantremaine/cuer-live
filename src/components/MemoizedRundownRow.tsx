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

// TEMPORARILY DISABLE MEMOIZATION TO TEST TYPING
const MemoizedRundownRow = ({
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
}: MemoizedRundownRowProps) => {
  console.log('🔄 MemoizedRundownRow render:', { itemId: item.id, itemName: item.name, itemScript: item.script?.substring(0, 20) });
  
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
}; // NO MEMOIZATION FOR TESTING

MemoizedRundownRow.displayName = 'MemoizedRundownRow';

export default MemoizedRundownRow;