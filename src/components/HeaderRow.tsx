
import React from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';
import { SearchHighlight } from '@/types/search';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  headerDuration?: string;
  hasClipboardData?: boolean;
  currentHighlight?: SearchHighlight | null;
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
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const HeaderRow = (props: HeaderRowProps) => {
  const {
    item,
    index,
    isSelected = false,
    selectedRowsCount = 1,
    selectedRows,
    hasClipboardData = false,
    onPasteRows,
    onClearSelection,
    onAddRow,
    onAddHeader,
    isDragging,
    columns,
    cellRefs,
    showColorPicker,
    currentHighlight,
    onUpdateItem,
    onCellClick,
    onKeyDown,
    onToggleColorPicker,
    onColorSelect,
    onDeleteRow,
    onToggleFloat,
    onRowSelect,
    onDragStart,
    onDragOver,
    onDrop,
    onCopySelectedRows,
    onDeleteSelectedRows,
    getColumnWidth,
    status
  } = props;

  const {
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
    selectedRowsCount,
    onRowSelect,
    onDeleteRow,
    onDeleteSelectedRows,
    onCopySelectedRows,
    onToggleColorPicker,
    onToggleFloat,
    selectedRows,
    onPasteRows
  });

  const { getRowClasses, getRowStyle } = useRowStyling({
    item,
    isSelected,
    isDragging,
    status,
    isHeader: true,
    color: item.color
  });

  return (
    <RundownContextMenu
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onColorPicker={handleContextMenuColor}
      onToggleFloat={handleContextMenuFloat}
      onPaste={hasClipboardData ? handleContextMenuPaste : undefined}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
      isSelected={isSelected}
      selectedCount={selectedRowsCount}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      isFloated={item.isFloating}
      selectedRows={selectedRows}
    >
      <tr
        className={`
          ${getRowClasses()} 
          bg-blue-50 dark:bg-blue-950 hover:bg-blue-100 dark:hover:bg-blue-900
          ${isSelected ? 'ring-2 ring-blue-500 bg-blue-100 dark:bg-blue-800' : ''}
          cursor-pointer transition-all duration-150 ease-in-out
        `}
        style={getRowStyle()}
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        {/* Row number column - empty for headers */}
        <td className="w-12 p-2 text-center border-r border-border">
          <div className="text-xs text-muted-foreground font-medium">H</div>
        </td>

        {/* Data columns */}
        {columns.map((column) => (
          <td
            key={column.id}
            className="border-r border-border last:border-r-0 p-0"
            style={{ width: getColumnWidth(column) }}
          >
            <CellRenderer
              item={item}
              column={column}
              cellRefs={cellRefs}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              onToggleColorPicker={onToggleColorPicker}
              onColorSelect={onColorSelect}
              isHeader={true}
            />
          </td>
        ))}
      </tr>
    </RundownContextMenu>
  );
};

export default HeaderRow;
