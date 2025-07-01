import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import RegularRowContent from './row/RegularRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { SearchState, SearchMatch } from '@/hooks/useRundownSearch';

interface RegularRowProps {
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
  hasClipboardData?: boolean;
  currentSegmentId?: string | null;
  searchState?: SearchState;
  currentMatch?: SearchMatch | null;
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
  onSearchOpen?: () => void;
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
    showColorPicker,
    hasClipboardData = false,
    currentSegmentId,
    searchState,
    currentMatch,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    onJumpToHere,
    onSearchOpen,
    isDragging
  } = props;

  const { rowClass } = useRowStyling({
    isDragging,
    isSelected,
    status,
    color: item.color,
    isFloated: item.isFloated,
    item
  });

  const {
    handleRowClick,
    handleContextMenu,
    handleContextMenuCopy,
    handleContextMenuDelete,
    handleContextMenuFloat,
    handleContextMenuColor,
    handleContextMenuPaste,
    handleJumpToHere,
    handleDragStart,
    handleMouseDown
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
    onToggleFloat: props.onToggleFloat,
    onDragStart: props.onDragStart,
    onJumpToHere: props.onJumpToHere
  });

  const backgroundColor = item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined;

  // Enhanced drag start handler that prevents dragging when selecting text
  const handleDragStartEnhanced = (e: React.DragEvent) => {
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
  const handleMouseDownEnhanced = (e: React.MouseEvent) => {
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

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={item.isFloated}
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
        onDragStart={handleDragStartEnhanced}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, index)}
        onMouseDown={handleMouseDownEnhanced}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
      >
        <RegularRowContent
          item={item}
          rowNumber={rowNumber}
          columns={props.columns}
          cellRefs={props.cellRefs}
          backgroundColor={backgroundColor}
          status={status}
          isCurrentlyPlaying={props.isCurrentlyPlaying}
          isDraggingMultiple={props.isDraggingMultiple}
          isSelected={isSelected}
          currentSegmentId={currentSegmentId}
          searchState={searchState}
          currentMatch={currentMatch}
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
