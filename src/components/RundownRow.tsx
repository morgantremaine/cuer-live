
import React from 'react';
import { Trash2, Move } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ColorPicker from './ColorPicker';

interface RundownItem {
  id: string;
  segmentName: string;
  duration: string;
  startTime: string;
  endTime: string;
  notes: string;
  status: 'upcoming' | 'current' | 'completed';
  color?: string;
  isHeader?: boolean;
  customFields?: { [key: string]: string };
}

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
}

interface RundownRowProps {
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

const RundownRow = ({
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
}: RundownRowProps) => {
  let rowClass = 'bg-white hover:bg-gray-50';
  
  if (isDragging) {
    rowClass = 'bg-blue-100 opacity-50';
  } else if (item.isHeader) {
    rowClass = 'bg-gray-600 border-l-4 border-gray-800 font-semibold text-white';
  } else if (item.color) {
    rowClass = `hover:opacity-90`;
  } else if (status === 'current') {
    rowClass = 'bg-green-50 border-l-4 border-green-500';
  } else if (status === 'completed') {
    rowClass = 'bg-gray-50 text-gray-500';
  }

  const getCellValue = (column: Column) => {
    if (column.isCustom) {
      return item.customFields?.[column.key] || '';
    }
    return (item as any)[column.key] || '';
  };

  const getFieldKey = (column: Column) => {
    return column.isCustom ? column.key : column.key;
  };

  if (item.isHeader) {
    return (
      <tr 
        className={`border-b border-gray-200 ${rowClass} transition-colors cursor-move`}
        draggable
        onDragStart={(e) => onDragStart(e, index)}
        onDragOver={onDragOver}
        onDrop={(e) => onDrop(e, index)}
      >
        <td className="px-4 py-2 text-sm text-gray-300 font-mono">
          <div className="flex items-center space-x-2">
            <Move className="h-4 w-4 text-gray-400" />
            <span>{rowNumber}</span>
          </div>
        </td>
        <td colSpan={columns.length} className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <span className="text-xl font-bold text-white">{item.segmentName}</span>
            <input
              ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
              type="text"
              value={item.notes}
              onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
              onClick={() => onCellClick(item.id, 'notes')}
              onKeyDown={(e) => onKeyDown(e, item.id, 'notes')}
              className="flex-1 border-none bg-transparent text-white placeholder-gray-300 focus:bg-gray-700 focus:border-gray-500 focus:outline-none focus:ring-2 focus:ring-gray-400 rounded px-2 py-1 text-sm"
              placeholder="Header description..."
            />
          </div>
        </td>
        <td className="px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteRow(item.id)}
            className="text-red-300 hover:text-red-200 hover:bg-red-900"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </td>
      </tr>
    );
  }

  return (
    <tr 
      className={`border-b border-gray-200 ${rowClass} transition-colors cursor-move`}
      style={{ backgroundColor: item.color || undefined }}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <td className="px-4 py-2 text-sm text-gray-600 font-mono">
        <div className="flex items-center space-x-2">
          <Move className="h-4 w-4 text-gray-400" />
          <span>{rowNumber}</span>
        </div>
      </td>
      {columns.map((column) => {
        const fieldKey = getFieldKey(column);
        const value = getCellValue(column);
        
        if (column.key === 'endTime') {
          return (
            <td key={column.id} className="px-4 py-2">
              <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                {value}
              </span>
            </td>
          );
        }

        if (column.key === 'notes' || column.isCustom) {
          return (
            <td key={column.id} className="px-4 py-2">
              <textarea
                ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
                value={value}
                onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
                onClick={() => onCellClick(item.id, fieldKey)}
                onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
                className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm resize-none"
                rows={1}
              />
            </td>
          );
        }

        return (
          <td key={column.id} className="px-4 py-2">
            <input
              ref={el => el && (cellRefs.current[`${item.id}-${fieldKey}`] = el)}
              type="text"
              value={value}
              onChange={(e) => onUpdateItem(item.id, fieldKey, e.target.value)}
              onClick={() => onCellClick(item.id, fieldKey)}
              onKeyDown={(e) => onKeyDown(e, item.id, fieldKey)}
              className={`w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm ${
                column.key === 'duration' || column.key === 'startTime' ? 'font-mono' : ''
              }`}
              placeholder={column.key === 'duration' || column.key === 'startTime' ? '00:00:00' : ''}
            />
          </td>
        );
      })}
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
            className="text-red-500 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </td>
    </tr>
  );
};

export default RundownRow;
