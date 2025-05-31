
import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from './CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface HeaderRowProps {
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
  headerDuration: string;
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
  isDragging: boolean;
  getColumnWidth: (column: Column) => string;
}

const HeaderRow = ({
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
  headerDuration,
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
}: HeaderRowProps) => {
  let rowClass = '';
  
  if (isDragging) {
    if (isDraggingMultiple && isSelected) {
      rowClass = 'bg-blue-200 dark:bg-blue-800 opacity-70 border-2 border-blue-400';
    } else {
      rowClass = 'bg-blue-100 dark:bg-blue-900 opacity-50';
    }
  } else if (isSelected) {
    rowClass = 'bg-blue-100 dark:bg-blue-800 border-l-4 border-blue-500';
  } else if (item.color && item.color !== '#FFFFFF') {
    rowClass = `hover:opacity-90`;
  } else {
    rowClass = 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700';
  }

  const textColor = item.color && item.color !== '#FFFFFF' ? getContrastTextColor(item.color) : '';

  const handleRowClick = (e: React.MouseEvent) => {
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
      className={`border-b-2 border-gray-400 dark:border-gray-500 font-bold ${rowClass} transition-colors cursor-pointer select-none`}
      style={{ 
        backgroundColor: item.color && item.color !== '#FFFFFF' ? item.color : undefined,
        color: textColor || undefined
      }}
      draggable
      onClick={handleRowClick}
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <td 
        className="px-4 py-3 text-sm font-mono cursor-move row-number-cell" 
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
      {columns.map((column) => {
        if (column.id === 'duration' && headerDuration) {
          return (
            <td 
              key={column.id} 
              className="px-4 py-3 text-sm font-mono"
              style={{ 
                color: textColor || undefined,
                width: getColumnWidth(column)
              }}
            >
              {headerDuration}
            </td>
          );
        }
        
        return (
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
        );
      })}
    </tr>
  );
};

export default HeaderRow;
