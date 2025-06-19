
import React from 'react';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  visibleColumns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  isSelected: boolean;
  isDragged: boolean;
  isDropTarget: boolean;
  isDraggingMultiple: boolean;
  showColorPicker: boolean;
  isCurrent: boolean;
  getColumnWidth: (columnId: string) => string;
  rowNumber: number;
  rowStatus: 'upcoming' | 'current' | 'completed';
  headerDuration: string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (id: string) => void;
  onColorSelect: (id: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, targetIndex?: number) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  highlightedCell?: {
    itemId: string;
    field: string;
    startIndex: number;
    endIndex: number;
  } | null;
}

const RundownRow = ({
  item,
  index,
  visibleColumns,
  cellRefs,
  isSelected,
  isDragged,
  isDropTarget,
  isDraggingMultiple,
  showColorPicker,
  isCurrent,
  getColumnWidth,
  rowNumber,
  rowStatus,
  headerDuration,
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
  highlightedCell
}: RundownRowProps) => {
  const commonProps = {
    item,
    index,
    visibleColumns,
    cellRefs,
    isSelected,
    isDragged,
    isDropTarget,
    isDraggingMultiple,
    showColorPicker,
    isCurrent,
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
    onDragLeave,
    onDrop,
    highlightedCell
  };

  if (item.type === 'header') {
    return (
      <HeaderRow
        {...commonProps}
        headerDuration={headerDuration}
      />
    );
  }

  return (
    <RegularRow
      {...commonProps}
      rowNumber={rowNumber}
      rowStatus={rowStatus}
    />
  );
};

export default RundownRow;
