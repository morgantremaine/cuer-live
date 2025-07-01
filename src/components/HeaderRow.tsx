
import React from 'react';
import HeaderRowContent from './row/HeaderRowContent';
import RundownContextMenu from './RundownContextMenu';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { SearchState, SearchMatch } from '@/hooks/useRundownSearch';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  headerDuration: string;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  isSelected?: boolean;
  showColorPicker: string | null;
  hasClipboardData?: boolean;
  currentSegmentId?: string | null;
  searchState?: SearchState;
  currentMatch?: SearchMatch | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onSearchOpen?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const HeaderRow = (props: HeaderRowProps) => {
  const {
    item,
    index,
    rowNumber,
    selectedRowsCount = 1,
    selectedRows,
    isSelected = false,
    showColorPicker,
    hasClipboardData = false,
    currentSegmentId,
    searchState,
    currentMatch,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onSearchOpen,
    isDragging
  } = props;

  // Use the row event handlers hook
  const {
    handleDragStart,
    handleMouseDown,
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuFloat,
    handleContextMenuColor,
    handleContextMenuPaste
  } = useRowEventHandlers({
    item,
    index,
    isSelected,
    onRowSelect: props.onRowSelect,
    onDragStart: props.onDragStart,
    onCopySelectedRows: props.onCopySelectedRows,
    onDeleteSelectedRows: props.onDeleteSelectedRows,
    onDeleteRow: props.onDeleteRow,
    onToggleColorPicker: props.onToggleColorPicker,
    onPasteRows: props.onPasteRows
  });

  // Use the row styling hook
  const { rowClass } = useRowStyling({
    item,
    isSelected,
    isDragging,
    selectedRowsCount
  });

  const backgroundColor = item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined;

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={false}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker === item.id}
      itemId={item.id}
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={handleContextMenuFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      onSearchOpen={onSearchOpen}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer h-14 min-h-14`}
        style={{
          backgroundColor
        }}
        data-item-id={item.id}
        draggable
        onDragStart={handleDragStart}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, index)}
        onMouseDown={handleMouseDown}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
      >
        <HeaderRowContent
          item={item}
          columns={props.columns}
          headerDuration={props.headerDuration}
          rowNumber={rowNumber}
          backgroundColor={backgroundColor}
          currentSegmentId={currentSegmentId}
          searchState={searchState}
          currentMatch={currentMatch}
          cellRefs={props.cellRefs}
          onUpdateItem={props.onUpdateItem}
          onCellClick={props.onCellClick}
          onKeyDown={props.onKeyDown}
          getColumnWidth={props.getColumnWidth}
        />
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;
