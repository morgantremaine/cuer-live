
import React from 'react';
import { Trash2 } from 'lucide-react';
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
}

interface RundownRowProps {
  item: RundownItem;
  index: number;
  status: 'upcoming' | 'current' | 'completed';
  showColorPicker: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onUpdateItem: (id: string, field: keyof RundownItem, value: string) => void;
  onCellClick: (itemId: string, field: keyof RundownItem) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: keyof RundownItem) => void;
  onToggleColorPicker: (itemId: string) => void;
  onColorSelect: (itemId: string, color: string) => void;
  onDeleteRow: (id: string) => void;
}

const RundownRow = ({
  item,
  index,
  status,
  showColorPicker,
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleColorPicker,
  onColorSelect,
  onDeleteRow
}: RundownRowProps) => {
  let rowClass = 'bg-white hover:bg-gray-50';
  
  if (item.color) {
    rowClass = `hover:opacity-90`;
  } else if (status === 'current') {
    rowClass = 'bg-green-50 border-l-4 border-green-500';
  } else if (status === 'completed') {
    rowClass = 'bg-gray-50 text-gray-500';
  }

  return (
    <tr 
      className={`border-b border-gray-200 ${rowClass} transition-colors`}
      style={{ backgroundColor: item.color || undefined }}
    >
      <td className="px-4 py-2 text-sm text-gray-600 font-mono">
        {index + 1}
      </td>
      <td className="px-4 py-2">
        <input
          ref={el => el && (cellRefs.current[`${item.id}-segmentName`] = el)}
          type="text"
          value={item.segmentName}
          onChange={(e) => onUpdateItem(item.id, 'segmentName', e.target.value)}
          onClick={() => onCellClick(item.id, 'segmentName')}
          onKeyDown={(e) => onKeyDown(e, item.id, 'segmentName')}
          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm"
        />
      </td>
      <td className="px-4 py-2">
        <input
          ref={el => el && (cellRefs.current[`${item.id}-duration`] = el)}
          type="text"
          value={item.duration}
          onChange={(e) => onUpdateItem(item.id, 'duration', e.target.value)}
          onClick={() => onCellClick(item.id, 'duration')}
          onKeyDown={(e) => onKeyDown(e, item.id, 'duration')}
          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm font-mono"
          placeholder="00:00:00"
        />
      </td>
      <td className="px-4 py-2">
        <input
          ref={el => el && (cellRefs.current[`${item.id}-startTime`] = el)}
          type="text"
          value={item.startTime}
          onChange={(e) => onUpdateItem(item.id, 'startTime', e.target.value)}
          onClick={() => onCellClick(item.id, 'startTime')}
          onKeyDown={(e) => onKeyDown(e, item.id, 'startTime')}
          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm font-mono"
          placeholder="00:00:00"
        />
      </td>
      <td className="px-4 py-2">
        <span className="text-sm font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
          {item.endTime}
        </span>
      </td>
      <td className="px-4 py-2">
        <textarea
          ref={el => el && (cellRefs.current[`${item.id}-notes`] = el)}
          value={item.notes}
          onChange={(e) => onUpdateItem(item.id, 'notes', e.target.value)}
          onClick={() => onCellClick(item.id, 'notes')}
          onKeyDown={(e) => onKeyDown(e, item.id, 'notes')}
          className="w-full border-none bg-transparent focus:bg-white focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 rounded px-2 py-1 text-sm resize-none"
          rows={1}
        />
      </td>
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
