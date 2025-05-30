
import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ColorPicker from './ColorPicker';
import CellRenderer from './CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RegularRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  isDragging: boolean;
}

const RegularRow = ({
  item,
  index,
  rowNumber,
  status,
  showColorPicker,
  cellRefs,
  columns,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging
}: RegularRowProps) => {
  let rowClass = 'bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800';
  
  if (isDragging) {
    rowClass = 'bg-blue-100 dark:bg-blue-900 opacity-50';
  } else if (item.color) {
    rowClass = `hover:opacity-90`;
  } else if (status === 'current') {
    rowClass = 'bg-green-50 dark:bg-green-900 border-l-4 border-green-500';
  } else if (status === 'completed') {
    rowClass = 'bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400';
  }

  return (
    <tr 
      className={`border-b border-gray-200 dark:border-gray-700 ${rowClass} transition-colors cursor-move`}
      style={{ backgroundColor: item.color || undefined }}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 font-mono">
        <span>{rowNumber}</span>
      </td>
      {columns.map((column) => (
        <CellRenderer
          key={column.id}
          column={column}
          item={item}
          cellRefs={cellRefs}
          onUpdateItem={onUpdateItem}
          onCellClick={onCellClick}
          onKeyDown={onKeyDown}
        />
      ))}
      <td className="px-4 py-2">
        <div className="flex items-center space-x-1">
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
