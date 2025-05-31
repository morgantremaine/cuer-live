import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface HeaderRowProps {
  item: RundownItem;
  index: number;
  rowNumber: string;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  columns: Column[];
  headerDuration: string;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onDeleteRow: (id: string) => void;
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
  cellRefs,
  columns,
  headerDuration,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onDeleteRow,
  onDragStart,
  onDragOver,
  onDrop,
  isDragging,
  getColumnWidth
}: HeaderRowProps) => {
  const rowClass = isDragging 
    ? 'bg-blue-100 dark:bg-blue-900 opacity-50'
    : 'bg-gray-200 dark:bg-gray-800 border-l-4 border-gray-400 dark:border-gray-600 font-semibold hover:bg-gray-300 dark:hover:bg-gray-700';

  return (
    <tr 
      className={`border-b border-gray-200 dark:border-gray-700 ${rowClass} transition-colors cursor-move`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-mono" style={{ width: '80px' }}>
        <span className="text-xl font-bold text-gray-900 dark:text-white">{item.segmentName}</span>
      </td>
      {columns.map((column, columnIndex) => (
        <td key={column.id} className="px-4 py-3" style={{ width: getColumnWidth(column) }}>
          {column.key === 'segmentName' ? (
            <input
              ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
              type="text"
              value={item.notes}
              onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
              onClick={() => onCellClick(item.id, 'notes')}
              onKeyDown={(e) => onKeyDown(e, item.id, 'notes')}
              className="flex-1 border-none bg-transparent text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:bg-white dark:focus:bg-gray-600 focus:border-gray-300 dark:focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-400 rounded px-2 py-1 text-sm w-full"
              placeholder="Header description..."
            />
          ) : column.key === 'duration' ? (
            <span className="text-sm text-gray-600 dark:text-gray-400 font-mono">({headerDuration})</span>
          ) : column.key === 'notes' ? (
            // Skip notes column since it's now in segmentName column
            null
          ) : null}
        </td>
      ))}
      <td className="px-4 py-2" onClick={(e) => e.stopPropagation()} style={{ width: '120px' }}>
        <div className="flex items-center justify-end space-x-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteRow(item.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default HeaderRow;
