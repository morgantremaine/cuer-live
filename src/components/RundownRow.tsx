
import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  visibleColumns: Column[];
  currentTime: Date;
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  isSelected: boolean;
  isDragged: boolean;
  isDraggingMultiple: boolean;
  isDropTarget: boolean;
  currentSegmentId: string | null;
  hasClipboardData?: boolean;
  selectedRowId?: string | null;
  isHighlighted?: boolean;
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  getRowNumber: (index: number) => string;
  getRowStatus: (item: RundownItem) => 'upcoming' | 'current' | 'completed';
  getHeaderDuration: (index: number) => string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  onJumpToHere?: (segmentId: string) => void;
}

const RundownRow = ({
  item,
  index,
  visibleColumns,
  currentTime,
  showColorPicker,
  cellRefs,
  isSelected,
  isDragged,
  isDraggingMultiple,
  isDropTarget,
  currentSegmentId,
  hasClipboardData = false,
  selectedRowId = null,
  isHighlighted = false,
  getColumnWidth,
  updateColumnWidth,
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
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  onJumpToHere,
  ...props
}: RundownRowProps) => {
  const commonProps = {
    item,
    index,
    cellRefs,
    showColorPicker,
    hasClipboardData,
    selectedRowId,
    currentSegmentId,
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
    onDragLeave,
    onDrop,
    onCopySelectedRows,
    onDeleteSelectedRows,
    onPasteRows,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onJumpToHere,
    getColumnWidth,
    ...props
  };

  if (item.type === 'header') {
    return (
      <HeaderRow
        {...commonProps}
        rowNumber={getRowNumber(index)}
        columns={visibleColumns}
        headerDuration={getHeaderDuration(index)}
        selectedRowsCount={isSelected ? 1 : 0}
        isSelected={isSelected}
        isDragging={isDragged}
      />
    );
  }

  return (
    <RegularRow
      {...commonProps}
      rowNumber={getRowNumber(index)}
      status={getRowStatus(item)}
      columns={visibleColumns}
      selectedRowsCount={isSelected ? 1 : 0}
      isSelected={isSelected}
      isCurrentlyPlaying={currentSegmentId === item.id}
      isDraggingMultiple={isDraggingMultiple}
      isDragging={isDragged}
    />
  );
};

export default RundownRow;
