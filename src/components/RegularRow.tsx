
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
    handleContextMenuFloat
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
    onClearSelection
  });

  // Enhanced drag start handler that prevents dragging when selecting text
  const handleDragStart = (e: React.DragEvent) => {
    const target = e.target as HTMLElement;
    
    // Check if the target is an input, textarea, or if there's an active text selection
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    const hasTextSelection = window.getSelection()?.toString().length > 0;
    
    // If user is selecting text or interacting with text inputs, prevent dragging
    if (isTextInput || hasTextSelection) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    
    // Check if the mouse is down on a text input (even if target isn't the input itself)
    const textInputs = document.querySelectorAll('input, textarea');
    for (const input of textInputs) {
      if (input === document.activeElement) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }
    
    props.onDragStart(e, index);
  };

  // Enhanced mouse down handler to detect text selection intent
  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isTextInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
    
    // If clicking on text input, disable draggable temporarily
    if (isTextInput) {
      const row = e.currentTarget as HTMLElement;
      row.setAttribute('draggable', 'false');
      
      // Re-enable draggable after a short delay to allow text selection
      setTimeout(() => {
        if (row) {
          row.setAttribute('draggable', 'true');
        }
      }, 100);
    }
  };

  // Use backgroundColorOverride for floated rows, otherwise use item color
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
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={handleContextMenuFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer`}
        style={{
          backgroundColor
        }}
        draggable
        onDragStart={handleDragStart}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, index)}
        onMouseDown={handleMouseDown}
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
