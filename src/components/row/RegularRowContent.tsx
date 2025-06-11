
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
  backgroundColor?: string;
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
  backgroundColor,
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
        className="px-2 py-1 text-sm font-mono align-middle border-r border-border w-12 min-w-12"
        style={{ backgroundColor }}
      >
        <div className="flex items-center space-x-1">
          {isCurrentlyPlaying && (
            <Play 
              className="h-4 w-4 text-blue-500 fill-blue-500 scale-125" 
              style={{ filter: 'drop-shadow(0 0 1px black)' }}
            />
          )}
          <span style={{ color: textColor }}>{rowNumber}</span>
          {isDraggingMultiple && isSelected && (
            <span className="text-xs bg-blue-500 text-white px-1 rounded">M</span>
          )}
        </div>
      </td>
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        
        return (
          <td
            key={column.id}
            className="align-middle border-r border-border last:border-r-0"
            style={{ 
              width: columnWidth, 
              minWidth: columnWidth,
              backgroundColor 
            }}
          >
            <CellRenderer
              column={column}
              item={item}
              cellRefs={cellRefs}
              textColor={textColor}
              backgroundColor={backgroundColor}
              onUpdateItem={onUpdateItem}
              onCellClick={onCellClick}
              onKeyDown={onKeyDown}
              width={columnWidth}
            />
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
