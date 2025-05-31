
import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from './CellRenderer';
import RundownContextMenu from './RundownContextMenu';
import { RundownItem } from '@/hooks/useRundownItems';
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
  selectedRowsCount = 1,
  selectedRows,
  hasClipboardData = false,
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
  isDragging,
  getColumnWidth
}: RegularRowProps) => {
  let rowClass = '';
  let borderClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'opacity-70';
      borderClass = 'border-2 border-blue-400';
    } else {
      rowClass = 'opacity-50';
      borderClass = 'border-2 border-blue-300';
    }
  } else if (item.isFloating || item.isFloated) {
    rowClass = 'bg-red-800 text-white';
    borderClass = 'border-l-4 border-red-600';
  } else if (isSelected) {
    // For selected rows, use a very prominent blue outline that will show over any background
    borderClass = 'border-4 border-blue-500 shadow-lg ring-4 ring-blue-300 ring-opacity-50';
    rowClass = item.color && item.color !== '#FFFFFF' ? 'hover:opacity-90' : 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  } else if (item.color && item.color !== '#FFFFFF') {
    rowClass = 'hover:opacity-90';
  } else {
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  const textColor = (item.isFloating || item.isFloated) ? 'white' : (item.color && item.color !== '#FFFFFF' ? getContrastTextColor(item.color) : '');

  const handleRowClick = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    const isRowNumberCell = target.closest('td')?.classList.contains('row-number-cell');
    const isRowElement = target === e.currentTarget;
    
    if ((isRowElement || isRowNumberCell) && onRowSelect) {
      e.preventDefault();
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey);
    }
  };

  const handleContextMenuCopy = () => {
    if (isSelected && selectedRowsCount > 1) {
      onCopySelectedRows();
    } else {
      // Copy just this row
      onCopySelectedRows();
    }
  };

  const handleContextMenuDelete = () => {
    if (isSelected && selectedRowsCount > 1) {
      onDeleteSelectedRows();
    } else {
      onDeleteRow(item.id);
    }
  };

  const handleContextMenuFloat = () => {
    onToggleFloat(item.id);
  };

  const handleContextMenuColor = () => {
    onToggleColorPicker(item.id);
  };

  return (
    <RundownContextMenu
      selectedCount={isSelected ? selectedRowsCount : 1}
      selectedRows={selectedRows}
      isFloated={item.isFloating || item.isFloated}
      hasClipboardData={hasClipboardData}
      showColorPicker={showColorPicker}
      itemId={item.id}
      onCopy={handleContextMenuCopy}
      onDelete={handleContextMenuDelete}
      onToggleFloat={handleContextMenuFloat}
      onColorPicker={handleContextMenuColor}
      onColorSelect={onColorSelect}
      onPaste={onPasteRows}
      onClearSelection={onClearSelection}
    >
      <tr 
        className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} ${borderClass} transition-all cursor-pointer select-none relative`}
        style={{ 
          backgroundColor: (item.isFloating || item.isFloated) ? '#991b1b' : (item.color && item.color !== '#FFFFFF' ? item.color : undefined),
          color: textColor || undefined,
          position: 'relative'
        }}
        draggable
        onClick={handleRowClick}
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        <td 
          className="px-4 py-2 text-sm font-mono cursor-move row-number-cell" 
          style={{ color: textColor || undefined, width: '80px' }}
        >
          <div className="flex items-center space-x-2">
            {isCurrentlyPlaying && (
              <Play className="h-4 w-4 text-green-500 fill-green-500" />
            )}
            <span>{rowNumber}</span>
            {isDraggingMultiple && isSelected && (
              <span className="text-xs bg-blue-500 text-white px-1 rounded">M</span>
            )}
          </div>
        </td>
        {columns.map((column) => (
          <CellRenderer
            key={column.id}
            column={column}
            item={item}
            cellRefs={cellRefs}
            textColor={textColor}
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
