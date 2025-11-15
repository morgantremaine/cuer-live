
import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  headerDuration?: string;
  hasClipboardData?: boolean;
  currentSegmentId?: string | null;
  isCollapsed?: boolean;
  columnExpandState?: { [columnKey: string]: boolean };
  expandedCells?: Set<string>;
  onToggleCellExpanded?: (itemId: string, columnKey: string) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string, isInSelection?: boolean, selectionCount?: number) => void;
  onToggleFloat?: (id: string, isInSelection?: boolean, selectionCount?: number) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleCollapse?: (headerId: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: (targetRowId?: string, count?: number) => void;
  onAddHeader?: (targetRowId?: string) => void;
  onJumpToHere?: (segmentId: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  markActiveTyping?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
  allItems?: any[];
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
  // Per-cell editor indicators
  getEditorForCell?: (itemId: string, field: string) => { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
  onScrollToEditor?: (itemId: string) => void;
}

const RundownRow = (props: RundownRowProps) => {
  // Only use multi-selection state for determining if selected
  const isActuallySelected = props.isSelected || false;

  // Handle Jump to here functionality
  const handleJumpToHere = (segmentId: string) => {
    if (props.onJumpToHere) {
      props.onJumpToHere(segmentId);
    }
  };

  if (isHeaderItem(props.item)) {
    return (
      <HeaderRow 
        {...props} 
        isSelected={isActuallySelected}
        headerDuration={props.headerDuration || ''}
        selectedRowsCount={props.selectedRowsCount || 1}
        selectedRows={props.selectedRows}
        hasClipboardData={props.hasClipboardData}
        currentSegmentId={props.currentSegmentId}
        isCollapsed={props.isCollapsed}
        columnExpandState={props.columnExpandState}
        expandedCells={props.expandedCells}
        onToggleCellExpanded={props.onToggleCellExpanded}
        onToggleCollapse={props.onToggleCollapse}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        onMoveUp={props.onMoveUp}
        onMoveDown={props.onMoveDown}
        onDragEnd={props.onDragEnd}
        markActiveTyping={props.markActiveTyping}
        isHeaderCollapsed={props.isHeaderCollapsed}
        getHeaderGroupItemIds={props.getHeaderGroupItemIds}
        // Note: onJumpToHere not passed to HeaderRow since headers don't need jump functionality
      />
    );
  }

  return (
    <RegularRow 
      {...props} 
      isSelected={isActuallySelected}
      isCurrentlyPlaying={props.isCurrentlyPlaying}
      isDraggingMultiple={props.isDraggingMultiple}
      selectedRowsCount={props.selectedRowsCount || 1}
      selectedRows={props.selectedRows}
      hasClipboardData={props.hasClipboardData}
      currentSegmentId={props.currentSegmentId}
      columnExpandState={props.columnExpandState}
      expandedCells={props.expandedCells}
      onToggleCellExpanded={props.onToggleCellExpanded}
      onToggleFloat={props.onToggleFloat || (() => {})}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onJumpToHere={handleJumpToHere}
      onMoveUp={props.onMoveUp}
      onMoveDown={props.onMoveDown}
      onDragEnd={props.onDragEnd}
      markActiveTyping={props.markActiveTyping}
      isHeaderCollapsed={props.isHeaderCollapsed}
      getHeaderGroupItemIds={props.getHeaderGroupItemIds}
      allItems={props.allItems}
    />
  );
};

export default RundownRow;
