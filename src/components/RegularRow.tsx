
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import RegularRowContent from './row/RegularRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { calculateScriptDuration } from '@/utils/scriptTiming';

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
  columnExpandState?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
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
  onRowSelect?: (itemId: string, index: number, isShiftClick: boolean, isCtrlClick: boolean, headerGroupItemIds?: string[]) => void;
  onAddRow?: () => void;
  onAddHeader?: () => void;
  onJumpToHere?: (segmentId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
  allItems?: any[];
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
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
    isDragging,
    allItems
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
    onJumpToHere,
    isHeaderCollapsed: props.isHeaderCollapsed,
    getHeaderGroupItemIds: props.getHeaderGroupItemIds
  });

  // Enhanced drag start handler with better text selection detection
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

  // Handle auto time to script for single row
  const handleAutoTimeToScript = () => {
    const scriptDuration = calculateScriptDuration(item.script || '');
    if (scriptDuration && scriptDuration !== '00:00') {
      props.onUpdateItem(item.id, 'duration', scriptDuration);
    }
    // Clear selection after auto timing
    if (onClearSelection) {
      onClearSelection();
    }
  };

  // Handle auto time to script for multiple rows
  const handleAutoTimeToScriptMultiple = (selectedRows: Set<string>) => {
    if (!allItems) return;
    
    selectedRows.forEach(rowId => {
      const targetItem = allItems.find(item => item.id === rowId);
      if (targetItem && targetItem.script && targetItem.script.trim().length > 0) {
        const scriptDuration = calculateScriptDuration(targetItem.script);
        if (scriptDuration && scriptDuration !== '00:00') {
          props.onUpdateItem(rowId, 'duration', scriptDuration);
        }
      }
    });
    
    // Clear selection after auto timing
    if (onClearSelection) {
      onClearSelection();
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
      onAutoTimeToScript={handleAutoTimeToScript}
      onAutoTimeToScriptMultiple={handleAutoTimeToScriptMultiple}
      scriptText={item.script}
      allItems={allItems}
    >
      <tr 
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer h-14 min-h-14 animate-fade-in`}
        style={{ backgroundColor }}
        data-item-id={item.id}
        data-type="regular"
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
          columnExpandState={props.columnExpandState}
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
