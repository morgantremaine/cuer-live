
import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  columnExpandState?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
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
    onJumpToHere
  } = props;

  // @dnd-kit sortable hook
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isDndKitDragging,
  } = useSortable({ 
    id: item.id,
    disabled: false // Enable dragging for this row
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const { rowClass, backgroundColorOverride } = useRowStyling({
    isDragging: isDndKitDragging,
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
        ref={setNodeRef}
        style={{ ...style, backgroundColor }}
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer ${
          isDndKitDragging ? 'opacity-50' : ''
        }`}
        data-item-id={item.id}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
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
