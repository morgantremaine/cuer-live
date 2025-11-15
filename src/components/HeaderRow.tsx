
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
  expandedCells?: Set<string>;
  onToggleCellExpanded?: (itemId: string, columnKey: string) => void;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string, isInSelection?: boolean, selectionCount?: number) => void;
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
  onAddRow?: (targetRowId?: string, count?: number) => void;
  onAddHeader?: (targetRowId?: string) => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  markActiveTyping?: () => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
  // Header collapse props
  isHeaderCollapsed?: (headerId: string) => boolean;
  getHeaderGroupItemIds?: (headerId: string) => string[];
  // Per-cell editor indicators
  getEditorForCell?: (itemId: string, field: string) => { userId: string; userName: string } | null;
  onCellFocus?: (itemId: string, field: string) => void;
  onCellBlur?: (itemId: string, field: string) => void;
  onScrollToEditor?: (itemId: string) => void;
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

  // Clone the actual row for drag image to match exactly
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
    
    // Find the actual row element and clone it
    const rowElement = e.currentTarget as HTMLTableRowElement;
    if (rowElement) {
      const clonedRow = rowElement.cloneNode(true) as HTMLTableRowElement;
      
      // Create a table wrapper to maintain proper rendering
      const tableWrapper = document.createElement('table');
      tableWrapper.style.position = 'absolute';
      tableWrapper.style.top = '-1000px';
      tableWrapper.style.left = '-1000px';
      tableWrapper.style.borderCollapse = 'collapse';
      tableWrapper.style.backgroundColor = backgroundColor || 'white';
      
      const tbody = document.createElement('tbody');
      tbody.appendChild(clonedRow);
      tableWrapper.appendChild(tbody);
      
      document.body.appendChild(tableWrapper);
      e.dataTransfer.setDragImage(tableWrapper, 20, 20);
      
      // Clean up after drag starts
      setTimeout(() => {
        if (document.body.contains(tableWrapper)) {
          document.body.removeChild(tableWrapper);
        }
      }, 100);
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
        style={{ 
          backgroundColor,
          contain: 'style paint'
        }}
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
