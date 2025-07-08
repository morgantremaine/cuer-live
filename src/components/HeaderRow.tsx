import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
  isCollapsed?: boolean;
  columnExpandState?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
  onCopySelectedRows: () => void;
  onDeleteSelectedRows: () => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onToggleCollapse?: (headerId: string) => void;
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
    headerDuration,
    selectedRowsCount = 1,
    selectedRows,
    isSelected = false,
    showColorPicker,
    hasClipboardData = false,
    currentSegmentId,
    isCollapsed = false,
    onToggleCollapse,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader
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
    isDraggingMultiple: false,
    isSelected,
    isCurrentlyPlaying: false,
    status: 'upcoming' as const,
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
    onToggleFloat: undefined,
    selectedRows,
    onPasteRows: props.onPasteRows,
    onClearSelection,
    onJumpToHere: undefined
  });

  const backgroundColor = backgroundColorOverride || 
    (item.color && item.color !== '#FFFFFF' && item.color !== '#ffffff' ? item.color : undefined);

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
    >
      <tr 
        ref={setNodeRef}
        style={{ ...style, backgroundColor }}
        className={`border-b border-border ${rowClass} transition-colors cursor-pointer h-14 min-h-14 ${
          isDndKitDragging ? 'opacity-50' : ''
        }`}
        data-item-id={item.id}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        {...attributes}
        {...listeners}
      >
        <HeaderRowContent
          item={item}
          columns={props.columns}
          headerDuration={headerDuration}
          rowNumber={rowNumber}
          backgroundColor={backgroundColor}
          currentSegmentId={currentSegmentId}
          cellRefs={props.cellRefs}
          isCollapsed={isCollapsed}
          onUpdateItem={props.onUpdateItem}
          onCellClick={props.onCellClick}
          onKeyDown={props.onKeyDown}
          onToggleCollapse={onToggleCollapse}
          getColumnWidth={props.getColumnWidth}
        />
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;