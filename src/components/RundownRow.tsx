
import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

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
  expandedColumns?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat?: (id: string) => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleCollapse?: (headerId: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RundownRow = (props: RundownRowProps) => {
  // Only use multi-selection state for determining if selected
  const isActuallySelected = props.isSelected || false;

  // Debug wrapper for onJumpToHere
  const handleJumpToHereDebug = (segmentId: string) => {
    console.log('🎯 RundownRow: onJumpToHere called with segmentId:', segmentId);
    console.log('🎯 RundownRow: onJumpToHere function exists:', !!props.onJumpToHere);
    if (props.onJumpToHere) {
      console.log('🎯 RundownRow: Calling parent onJumpToHere');
      props.onJumpToHere(segmentId);
    } else {
      console.log('🎯 RundownRow: onJumpToHere is undefined!');
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
        expandedColumns={props.expandedColumns}
        onToggleCollapse={props.onToggleCollapse}
        onPasteRows={props.onPasteRows}
        onClearSelection={props.onClearSelection}
        onAddRow={props.onAddRow}
        onAddHeader={props.onAddHeader}
        onDragEnd={props.onDragEnd}
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
      expandedColumns={props.expandedColumns}
      onToggleFloat={props.onToggleFloat || (() => {})}
      onPasteRows={props.onPasteRows}
      onClearSelection={props.onClearSelection}
      onAddRow={props.onAddRow}
      onAddHeader={props.onAddHeader}
      onJumpToHere={handleJumpToHereDebug}
      onDragEnd={props.onDragEnd}
    />
  );
};

export default RundownRow;
