
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
        className="px-2 py-1 text-sm font-mono align-middle border border-gray-300 bg-white"
        style={{ 
          color: textColor || '#000000', 
          width: '40px', 
          minWidth: '40px',
          display: 'table-cell',
          visibility: 'visible',
          opacity: 1,
          minHeight: '32px',
          border: '1px solid #d1d5db',
          position: 'relative',
          zIndex: 1
        }}
      >
        <div className="flex items-center space-x-1">
          {isCurrentlyPlaying && (
            <Play 
              className="h-4 w-4 text-blue-500 fill-blue-500 scale-125" 
              style={{ filter: 'drop-shadow(0 0 1px black)' }}
            />
          )}
          <span>{rowNumber}</span>
          {isDraggingMultiple && isSelected && (
            <span className="text-xs bg-blue-500 text-white px-1 rounded">M</span>
          )}
        </div>
      </td>
      {columns.map((column) => (
        <td
          key={column.id}
          className="align-middle border border-gray-300 bg-white"
          style={{ 
            width: getColumnWidth(column),
            minWidth: '100px',
            display: 'table-cell',
            visibility: 'visible',
            opacity: 1,
            minHeight: '32px',
            border: '1px solid #d1d5db',
            backgroundColor: '#ffffff',
            position: 'relative',
            zIndex: 1
          }}
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
