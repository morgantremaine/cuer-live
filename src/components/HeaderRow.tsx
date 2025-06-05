import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import HeaderRowContent from './row/HeaderRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { useTheme } from '@/hooks/useTheme';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  headerDuration: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  isSelected?: boolean;
  selectedRowsCount?: number;
  selectedRows?: Set<string>;
  hasClipboardData?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
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
    headerDuration,
    selectedRowsCount = 1,
    selectedRows,
    isSelected = false,
    showColorPicker,
    hasClipboardData = false,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    isDragging
  } = props;

  const { isDark } = useTheme();

  const { rowClass } = useRowStyling({
    isDragging,
    isSelected,
    isHeader: true
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

  // Headers don't support floating, so provide a no-op function
  const handleToggleFloat = () => {
    // No-op for headers
  };

  // Headers: #e5e7eb in light mode, #212936 in dark mode
  const headerBackgroundColor = isDark ? '#212936' : '#e5e7eb';

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
      onToggleFloat={handleToggleFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={handleContextMenuPaste}
      onClearSelection={onClearSelection}
      onAddRow={onAddRow}
      onAddHeader={onAddHeader}
    >
      <tr 
        className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} transition-all cursor-pointer select-none`}
        style={{ 
          backgroundColor: headerBackgroundColor
        }}
        draggable
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => props.onDragStart(e, index)}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, index)}
      >
        <HeaderRowContent
          item={item}
          columns={props.columns}
          headerDuration={headerDuration}
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
