
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
  searchTerm?: string;
  hasSearchMatch?: boolean;
  isCurrentSearchResult?: boolean;
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
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RundownRow = React.memo((props: RundownRowProps) => {
  const isActuallySelected = props.isSelected || false;

  const handleJumpToHereDebug = (segmentId: string) => {
    if (props.onJumpToHere) {
      props.onJumpToHere(segmentId);
    }
  };

  const commonProps = {
    ...props,
    isSelected: isActuallySelected,
    selectedRowsCount: props.selectedRowsCount || 1,
    selectedRows: props.selectedRows,
    hasClipboardData: props.hasClipboardData,
    currentSegmentId: props.currentSegmentId,
    onPasteRows: props.onPasteRows,
    onClearSelection: props.onClearSelection,
    onAddRow: props.onAddRow,
    onAddHeader: props.onAddHeader,
  };

  if (isHeaderItem(props.item)) {
    return (
      <HeaderRow 
        {...commonProps}
        headerDuration={props.headerDuration || ''}
        // Headers don't need jump functionality
      />
    );
  }

  return (
    <RegularRow 
      {...commonProps}
      isCurrentlyPlaying={props.isCurrentlyPlaying}
      isDraggingMultiple={props.isDraggingMultiple}
      onToggleFloat={props.onToggleFloat || (() => {})}
      onJumpToHere={handleJumpToHereDebug}
    />
  );
});

RundownRow.displayName = 'RundownRow';

export default RundownRow;
