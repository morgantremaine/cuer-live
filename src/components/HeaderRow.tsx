
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import HeaderRowContent from './row/HeaderRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

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
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
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
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
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
    onPasteRows: props.onPasteRows
  });

  // Enhanced drag start handler with better text selection detection
  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    
    // More comprehensive checks for text interaction
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    const isContentEditable = (target as HTMLElement).contentEditable === 'true' || (target as HTMLElement).isContentEditable;
    const isInsideInput = target.closest('input, textarea, [contenteditable="true"]');
    const isFocusedInput = document.activeElement && 
      (document.activeElement.tagName === 'INPUT' || 
       document.activeElement.tagName === 'TEXTAREA' ||
       (document.activeElement as HTMLElement).contentEditable === 'true');
    
    if (isTextInput || hasTextSelection || isContentEditable || isInsideInput || isFocusedInput) {
      console.log('🚫 HeaderRow: Preventing drag - text interaction detected');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    console.log('🚀 HeaderRow: Starting drag for index', index);
    onDragStart(e, index);
  };

  // Enhanced drag end handler with logging
  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 HeaderRow: Drag end for index', index);
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
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={() => {}}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer h-14 min-h-14`}
        style={{ backgroundColor }}
        data-item-id={item.id}
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🎯 HeaderRow: Drop at index', index);
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
