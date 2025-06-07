
import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';

interface RegularRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const RegularRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  textColor,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  isSelected = false,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: RegularRowContentProps) => {
  return (
    <>
      <td 
        className="px-2 py-1 text-sm font-mono align-middle relative"
        style={{ color: textColor || undefined, width: '60px' }}
      >
        <div className="flex items-center space-x-1">
          {isCurrentlyPlaying && (
            <div className="absolute -left-8 top-1/2 transform -translate-y-1/2">
              <div className="flex items-center space-x-1">
                <div className="w-0 h-0 border-l-8 border-l-green-500 border-t-4 border-t-transparent border-b-4 border-b-transparent animate-pulse"></div>
              </div>
            </div>
          )}
          <span className="relative z-10">{rowNumber}</span>
          {isDraggingMultiple && isSelected && (
            <span className="text-xs bg-blue-500 text-white px-1 rounded">M</span>
          )}
        </div>
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="align-middle"
          style={{ width: getColumnWidth(column) }}
        >
          <CellRenderer
            column={column}
            item={item}
            cellRefs={cellRefs}
            textColor={textColor}
            onUpdateItem={onUpdateItem}
            onCellClick={onCellClick}
            onKeyDown={onKeyDown}
            width={getColumnWidth(column)}
          />
        </td>
      ))}
    </>
  );
};

export default RegularRowContent;
