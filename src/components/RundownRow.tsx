
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import CellRenderer from './CellRenderer';
import HeaderRowContent from './row/HeaderRowContent';
import RegularRowContent from './row/RegularRowContent';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected: boolean;
  isCurrentlyPlaying: boolean;
  isDraggingMultiple: boolean;
  selectedRowsCount: number;
  selectedRows: Set<string>;
  headerDuration: string;
  hasClipboardData: boolean;
  isDragging: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onRowSelect: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onPasteRows: () => void;
  onClearSelection: () => void;
  onAddRow: () => void;
  onAddHeader: () => void;
  getColumnWidth: (column: Column) => string;
  getHighlightForCell?: (itemId: string, field: string) => { startIndex: number; endIndex: number } | null;
}

const RundownRow = ({ 
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  isSelected,
  isCurrentlyPlaying,
  isDraggingMultiple,
  selectedRowsCount,
  selectedRows,
  headerDuration,
  hasClipboardData,
  isDragging,
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
  onCopySelectedRows,
  onDeleteSelectedRows,
  onPasteRows,
  onClearSelection,
  onAddRow,
  onAddHeader,
  getColumnWidth,
  getHighlightForCell
}: RundownRowProps) => {

  if (isHeaderItem(item)) {
    return (
      <HeaderRowContent
        item={item}
        rowNumber={rowNumber}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        columns={columns}
        isSelected={isSelected}
        isDraggingMultiple={isDraggingMultiple}
        selectedRowsCount={selectedRowsCount}
        selectedRows={selectedRows}
        headerDuration={headerDuration}
        hasClipboardData={hasClipboardData}
        isDragging={isDragging}
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
        onCopySelectedRows={onCopySelectedRows}
        onDeleteSelectedRows={onDeleteSelectedRows}
        onPasteRows={onPasteRows}
        onClearSelection={onClearSelection}
        onAddRow={onAddRow}
        onAddHeader={onAddHeader}
        getColumnWidth={getColumnWidth}
        getHighlightForCell={getHighlightForCell}
      />
    );
  }

  return (
    <RegularRowContent
      item={item}
      rowNumber={rowNumber}
      status={status}
      showColorPicker={showColorPicker}
      cellRefs={cellRefs}
      columns={columns}
      isSelected={isSelected}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isDraggingMultiple={isDraggingMultiple}
      selectedRowsCount={selectedRowsCount}
      selectedRows={selectedRows}
      hasClipboardData={hasClipboardData}
      isDragging={isDragging}
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
      onCopySelectedRows={onCopySelectedRows}
      onDeleteSelectedRows={onDeleteSelectedRows}
      onPasteRows={onPasteRows}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      getColumnWidth={getColumnWidth}
      getHighlightForCell={getHighlightForCell}
    />
  );
};

export default RundownRow;
