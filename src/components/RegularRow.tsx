
import React from 'react';
import RundownContextMenu from './RundownContextMenu';
import RegularRowContent from './row/RegularRowContent';
import { useRowEventHandlers } from './row/useRowEventHandlers';
import { useRowStyling } from './row/useRowStyling';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

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
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onToggleFloat: (id: string) => void;
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

const RegularRow = (props: RegularRowProps) => {
  const {
    item,
    index,
    selectedRowsCount = 1,
    selectedRows,
    isSelected = false,
    isDraggingMultiple = false,
    showColorPicker,
    hasClipboardData = false,
    onColorSelect,
    onClearSelection,
    onAddRow,
    onAddHeader,
    isDragging
  } = props;

  const { rowClass } = useRowStyling({
    isDragging,
    isDraggingMultiple,
    isSelected,
    isFloating: item.isFloating,
    isFloated: item.isFloated,
    color: item.color
  });

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
    onRowSelect: props.onRowSelect,
    onDeleteRow: props.onDeleteRow,
    onDeleteSelectedRows: props.onDeleteSelectedRows,
    onCopySelectedRows: props.onCopySelectedRows,
    onToggleColorPicker: props.onToggleColorPicker,
    onToggleFloat: props.onToggleFloat,
    selectedRows,
    onPasteRows: props.onPasteRows
  });

  // Determine background color and text color for inline styles
  const isFloated = item.isFloating || item.isFloated;
  const hasCustomColor = item.color && item.color !== '#ffffff' && item.color !== '#FFFFFF' && item.color !== '';
  
  let inlineBackgroundColor: string | undefined;
  let inlineTextColor: string | undefined;
  
  if (isFloated) {
    // Floated items: red background, white text (handled by CSS classes)
    inlineBackgroundColor = undefined;
    inlineTextColor = undefined;
  } else if (hasCustomColor) {
    // Custom color items: use inline styles
    inlineBackgroundColor = item.color;
    inlineTextColor = getContrastTextColor(item.color);
  }
  // For default white/gray rows, let CSS classes handle the styling

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={isFloated}
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
        className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} transition-all cursor-pointer select-none`}
        style={{ 
          backgroundColor: inlineBackgroundColor,
          color: inlineTextColor
        }}
        draggable
        onClick={handleRowClick}
        onContextMenu={handleContextMenu}
        onDragStart={(e) => props.onDragStart(e, index)}
        onDragOver={props.onDragOver}
        onDrop={(e) => props.onDrop(e, index)}
      >
        <RegularRowContent
          item={item}
          rowNumber={props.rowNumber}
          columns={props.columns}
          cellRefs={props.cellRefs}
          textColor={inlineTextColor}
          isCurrentlyPlaying={props.isCurrentlyPlaying}
          isDraggingMultiple={isDraggingMultiple}
          isSelected={isSelected}
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
