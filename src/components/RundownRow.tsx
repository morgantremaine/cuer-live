
import React from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import HeaderRow from './HeaderRow';
import RegularRow from './RegularRow';

interface RundownRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed' | 'header';
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
  currentSegmentId: string | null;
  isDragging: boolean;
  searchTerm?: string;
  caseSensitive?: boolean;
  isCurrentMatch?: boolean;
  currentMatch?: { itemId: string; field: string } | null;
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
  onJumpToHere?: (segmentId: string) => void;
  getColumnWidth: (column: Column) => string;
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
  currentSegmentId,
  isDragging,
  searchTerm = '',
  caseSensitive = false,
  isCurrentMatch = false,
  currentMatch = null,
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
  onJumpToHere,
  getColumnWidth
}: RundownRowProps) => {

  if (isHeaderItem(item)) {
    return (
      <HeaderRow
        data-item-id={item.id}
        className={isCurrentMatch ? 'current-search-match' : ''}
        item={item}
        index={index}
        rowNumber={rowNumber}
        showColorPicker={showColorPicker}
        cellRefs={cellRefs}
        columns={columns}
        isSelected={isSelected}
        headerDuration={headerDuration}
        searchTerm={searchTerm}
        caseSensitive={caseSensitive}
        currentMatch={currentMatch}
        isDragging={isDragging}
        selectedRowsCount={selectedRowsCount}
        selectedRows={selectedRows}
        hasClipboardData={hasClipboardData}
        currentSegmentId={currentSegmentId}
        onUpdateItem={onUpdateItem}
        onCellClick={onCellClick}
        onKeyDown={onKeyDown}
        onToggleColorPicker={onToggleColorPicker}
        onColorSelect={onColorSelect}
        onDeleteRow={onDeleteRow}
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
      />
    );
  }

  return (
    <RegularRow
      data-item-id={item.id}
      className={isCurrentMatch ? 'current-search-match' : ''}
      item={item}
      index={index}
      rowNumber={rowNumber}
      status={status as 'upcoming' | 'current' | 'completed'}
      showColorPicker={showColorPicker}
      cellRefs={cellRefs}
      columns={columns}
      isSelected={isSelected}
      isCurrentlyPlaying={isCurrentlyPlaying}
      isDraggingMultiple={isDraggingMultiple}
      selectedRowsCount={selectedRowsCount}
      selectedRows={selectedRows}
      hasClipboardData={hasClipboardData}
      currentSegmentId={currentSegmentId}
      isDragging={isDragging}
      searchTerm={searchTerm}
      caseSensitive={caseSensitive}
      currentMatch={currentMatch}
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
      onJumpToHere={onJumpToHere}
      getColumnWidth={getColumnWidth}
    />
  );
};

export default RundownRow;
