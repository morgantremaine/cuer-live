
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import RegularRowContent from './row/RegularRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RegularRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  isSelected?: boolean;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  showColorPicker: string | null;
  hasClipboardData?: boolean;
  currentSegmentId?: string | null;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: (e: React.DragEvent) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onPasteRows?: () => void;
  onClearSelection?: () => void;
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean) => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RegularRow = (props: RegularRowProps) => {
  const {
    item,
    index,
    rowNumber,
    status,
    selectedRowsCount = 1,
    selectedRows,
    isSelected = false,
    isCurrentlyPlaying = false,
    isDraggingMultiple = false,
    showColorPicker,
    hasClipboardData = false,
    currentSegmentId,
    onToggleFloat,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onJumpToHere,
    onDragStart,
    onDragOver,
    onDrop,
    onDragEnd,
    isDragging
  } = props;

  const { rowClass, backgroundColorOverride } = useRowStyling({
    isDragging,
    isDraggingMultiple,
    isSelected,
    isCurrentlyPlaying,
    status,
    color: item.color,
    isFloating: item.isFloating,
    isFloated: item.isFloated
  });

  const {
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuColor,
    handleContextMenuPaste,
    handleContextMenuFloat,
    handleJumpToHere
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
    onToggleFloat,
    selectedRows,
    onPasteRows: props.onPasteRows,
    onClearSelection,
    onJumpToHere
  });

  // Enhanced drag start handler with better text selection detection
  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    
    // Check for text selection or input focus
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    const isContentEditable = target.contentEditable === 'true';
    
    if (isTextInput || hasTextSelection || isContentEditable) {
      console.log('🚫 RegularRow: Preventing drag - text interaction detected');
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    console.log('🚀 RegularRow: Starting drag for index', index);
    onDragStart(e, index);
  };

  // Safe drag end handler that checks if the function exists
  const handleDragEnd = (e: React.DragEvent) => {
    console.log('🏁 RegularRow: Drag end for index', index);
    // Use try-catch to prevent function invalidation errors
    try {
      if (onDragEnd && typeof onDragEnd === 'function') {
        onDragEnd(e);
      } else {
        console.warn('⚠️ RegularRow onDragEnd is not a function:', typeof onDragEnd);
        // Force reset any stuck drag states manually if the function is missing
        document.querySelectorAll('[draggable="true"]').forEach(el => {
          const htmlEl = el as HTMLElement;
          htmlEl.style.opacity = '';
          htmlEl.style.transform = '';
        });
      }
    } catch (error) {
      console.error('❌ Error in RegularRow onDragEnd:', error);
    }
  };

  const backgroundColor = backgroundColorOverride || 
    (item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined);

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={item.isFloating || false}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      itemType="regular"
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={handleContextMenuFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      onJumpToHere={handleJumpToHere}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer`}
        style={{ backgroundColor }}
        data-item-id={item.id}
        draggable
        onDragStart={handleDragStart}
        onDragOver={onDragOver}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('🎯 RegularRow: Drop at index', index);
          onDrop(e, index);
        }}
        onDragEnd={handleDragEnd}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
      >
        <RegularRowContent
          item={item}
          columns={props.columns}
          rowNumber={rowNumber}
          status={status}
          backgroundColor={backgroundColor}
          isCurrentlyPlaying={isCurrentlyPlaying}
          isDraggingMultiple={isDraggingMultiple}
          isSelected={isSelected}
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

export default RegularRow;
