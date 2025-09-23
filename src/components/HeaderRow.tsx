
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import HeaderRowContent from './row/HeaderRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';

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
  isCollapsed?: boolean;
  columnExpandState?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onToggleCollapse?: (headerId: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  markActiveTyping?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
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
    isCollapsed = false,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onMoveUp,
    onMoveDown,
    onToggleCollapse,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging
  } = props;

  const { rowClass } = useRowStyling({
    isDragging,
    isSelected,
    isHeader: true,
    color: item.color
  });

  const {
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuColor,
    handleContextMenuPaste
  } = useRowEventHandlers({
    item,
    index,
    isSelected,
    selectedRowsCount,
    onRowSelect: props.onRowSelect,
    onDeleteRow: props.onDeleteRow,
    onDeleteSelectedRows: props.onDeleteSelectedRows,
    onCopySelectedRows: props.onCopySelectedRows,
    onToggleColorPicker: props.onToggleColorPicker,
    selectedRows,
    onPasteRows: props.onPasteRows,
    onClearSelection: props.onClearSelection,
    isHeaderCollapsed: props.isHeaderCollapsed,
    getHeaderGroupItemIds: props.getHeaderGroupItemIds
  });

  // Simple drag start handler - same as regular rows
  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    
    // Check for text selection or input focus
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    const isContentEditable = target.contentEditable === 'true';
    
    // Check if target is within an expanded script cell or any editable area
    const isInExpandedCell = target.closest('.expandable-script-cell') !== null;
    const isInEditableArea = target.closest('[contenteditable="true"]') !== null || 
                            target.closest('textarea') !== null || 
                            target.closest('input') !== null;
    
    // Check if we're in an active editing state by looking for focused text inputs
    const activeElement = document.activeElement as HTMLElement;
    const isActivelyEditing = activeElement?.tagName === 'TEXTAREA' || 
                             activeElement?.tagName === 'INPUT' ||
                             activeElement?.contentEditable === 'true';
    
    if (isTextInput || hasTextSelection || isContentEditable || isInExpandedCell || isInEditableArea || isActivelyEditing) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    onDragStart(e, index);
  };

  // Enhanced drag end handler
  const handleDragEnd = (e: React.DragEvent) => {
    onDragEnd(e);
  };

  const backgroundColor = item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined;

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={false}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      itemType="header"
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={() => {}}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      onMoveUp={onMoveUp}
      onMoveDown={onMoveDown}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer h-16 min-h-16 animate-fade-in`}
        style={{ backgroundColor }}
        data-item-id={item.id}
        data-type="header"
        data-custom-color={item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? 'true' : 'false'}
        data-floated={item.isFloating ? 'true' : 'false'}
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onDrop(e, index);
        }}
        onDragEnd={handleDragEnd}
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
          cellRefs={props.cellRefs}
          isCollapsed={isCollapsed}
          isDragging={isDragging}
          onUpdateItem={props.onUpdateItem}
          onCellClick={props.onCellClick}
          onKeyDown={props.onKeyDown}
          onToggleCollapse={onToggleCollapse}
          markActiveTyping={props.markActiveTyping}
          getColumnWidth={props.getColumnWidth}
        />
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;
