
import React from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';
import { SearchHighlight } from '@/types/search';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';

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
  selectedRowsCount: number;
  selectedRows?: Set<string>;
  hasClipboardData?: boolean;
  currentHighlight?: SearchHighlight | null;
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
  onAddRowAfter?: (itemId: string) => void;
  onAddHeaderAfter?: (itemId: string) => void;
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const RegularRow = ({
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  isSelected = false,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  selectedRowsCount,
  selectedRows,
  hasClipboardData = false,
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
  onPasteRows,
  onClearSelection,
  onAddRowAfter,
  onAddHeaderAfter,
  isDragging,
  getColumnWidth
}: RegularRowProps) => {
  const isFloated = item.isFloating || item.isFloated;

  const handleRowClick = (e: React.MouseEvent) => {
    if (onRowSelect) {
      const isShiftClick = e.shiftKey;
      const isCtrlClick = e.ctrlKey || e.metaKey;
      onRowSelect(item.id, index, isShiftClick, isCtrlClick);
    }
  };

  const handleCopy = () => {
    onCopySelectedRows();
  };

  const handleDelete = () => {
    if (selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const handleToggleFloat = () => {
    onToggleFloat(item.id);
  };

  let rowClassName = 'border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer';
  
  if (isCurrentlyPlaying) {
    rowClassName += ' bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500';
  } else if (status === 'completed') {
    rowClassName += ' bg-green-50 dark:bg-green-900/20';
  } else if (isFloated) {
    rowClassName += ' bg-red-800 text-white opacity-75';
  }

  if (isSelected) {
    rowClassName += ' ring-2 ring-blue-500 ring-inset';
  }

  if (isDragging || isDraggingMultiple) {
    rowClassName += ' opacity-50';
  }

  const textColor = isFloated ? 'white' : (item.color && item.color !== '#ffffff' ? 'white' : '');

  return (
    <RundownContextMenu
      selectedCount={selectedRowsCount}
      selectedRows={selectedRows}
      isFloated={isFloated}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      onCopy={handleCopy}
      onDelete={handleDelete}
      onToggleFloat={handleToggleFloat}
      onColorPicker={() => onToggleColorPicker(item.id)}
      onColorSelect={onColorSelect}
      onPaste={onPasteRows}
      onClearSelection={onClearSelection}
      onAddRowAfter={onAddRowAfter}
      onAddHeaderAfter={onAddHeaderAfter}
    >
      <tr
        className={rowClassName}
        style={{ backgroundColor: !isFloated && item.color !== '#ffffff' && item.color ? item.color : undefined }}
        onClick={handleRowClick}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        <td className="px-1 py-2 text-sm font-medium w-12 text-center border-r border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-center space-x-1">
            {isCurrentlyPlaying && (
              <span className="text-red-600 text-xs">▶</span>
            )}
            {isFloated && (
              <span className="text-yellow-400 text-xs">🛟</span>
            )}
            <span style={{ color: textColor || undefined }}>{rowNumber}</span>
          </div>
        </td>
        
        {columns.map((column) => (
          <CellRenderer
            key={column.id}
            column={column}
            item={item}
            cellRefs={cellRefs}
            textColor={textColor}
            currentHighlight={currentHighlight}
            onUpdateItem={onUpdateItem}
            onCellClick={onCellClick}
            onKeyDown={onKeyDown}
            width={getColumnWidth(column)}
          />
        ))}
      </tr>
    </RundownContextMenu>
  );
};

export default RegularRow;
