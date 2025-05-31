
import React from 'react';
import { Trash2, Copy, Clipboard, Anchor, Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ColorPicker from './ColorPicker';
import CellRenderer from './CellRenderer';
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
  isDragging,
  getColumnWidth
}: RegularRowProps) => {
  let rowClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'bg-blue-200 dark:bg-blue-800 opacity-70 border-2 border-blue-400';
    } else {
      rowClass = 'bg-blue-100 dark:bg-blue-900 opacity-50';
    }
  } else if (item.isFloating || item.isFloated) {
    rowClass = 'bg-red-800 text-white border-l-4 border-red-600';
  } else if (isSelected) {
    rowClass = 'bg-blue-100 dark:bg-blue-800 border-l-4 border-blue-500';
  } else if (item.color && item.color !== '#FFFFFF') {
    rowClass = `hover:opacity-90`;
  } else {
    // Default styling for regular rows - light mode: white, dark mode: gray-700
    rowClass = 'bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600';
  }

  const textColor = (item.isFloating || item.isFloated) ? 'white' : (item.color && item.color !== '#FFFFFF' ? getContrastTextColor(item.color) : '');

  const handleRowClick = (e: React.MouseEvent) => {
    // Only handle row selection if the click target is the row itself or the row number cell
    const target = e.target as HTMLElement;
    const isRowNumberCell = target.closest('td')?.classList.contains('row-number-cell');
    const isRowElement = target === e.currentTarget;
    
    if ((isRowElement || isRowNumberCell) && onRowSelect) {
      e.preventDefault();
      onRowSelect(item.id, index, e.shiftKey, e.ctrlKey || e.metaKey);
    }
  };

  return (
    <tr 
      className={`border-b border-gray-300 dark:border-gray-600 ${rowClass} transition-colors cursor-pointer select-none`}
      style={{ 
        backgroundColor: (item.isFloating || item.isFloated) ? '#991b1b' : (item.color && item.color !== '#FFFFFF' ? item.color : undefined),
        color: textColor || undefined
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
      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()} style={{ width: '120px' }}>
        <div className="flex items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFloat(item.id)}
            className={`${(item.isFloating || item.isFloated) ? 'text-white hover:bg-red-700' : 'text-gray-500 hover:text-red-500'} hover:bg-red-50 dark:hover:bg-red-900`}
            title={(item.isFloating || item.isFloated) ? 'Unfloat row' : 'Float row'}
          >
            <Anchor className="h-4 w-4" />
          </Button>
          
          <ColorPicker
            itemId={item.id}
            showColorPicker={showColorPicker}
            onToggle={onToggleColorPicker}
            onColorSelect={onColorSelect}
          />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteRow(item.id)}
            className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default RegularRow;
