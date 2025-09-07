import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface RegularRowContentProps {
  item: RundownItem;
  rowNumber: string;
  columns: Column[];
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  textColor?: string;
  backgroundColor?: string;
  status?: 'upcoming' | 'current' | 'completed';
  isCurrentlyPlaying?: boolean;
  isDraggingMultiple?: boolean;
  isSelected?: boolean;
  currentSegmentId?: string | null;
  columnExpandState?: { [columnKey: string]: boolean };
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  markActiveTyping?: () => void;
  getColumnWidth: (column: Column) => string;
}

const RegularRowContent = ({
  item,
  rowNumber,
  columns,
  cellRefs,
  backgroundColor,
  status,
  isCurrentlyPlaying = false,
  isDraggingMultiple = false,
  isSelected = false,
  currentSegmentId,
  columnExpandState = {},
  onUpdateItem,
  onCellClick,
  onKeyDown,
  markActiveTyping,
  getColumnWidth
}: RegularRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-2 py-1 text-sm font-mono align-middle"
        style={{ 
          backgroundColor,
          width: '64px',
          minWidth: '64px',
          maxWidth: '64px',
          borderRight: '1px solid hsl(var(--border))'
        }}
      >
        <div className="flex items-center justify-center relative w-full h-6">
          {isCurrentlyPlaying && (
            <Play 
              className="h-4 w-4 text-blue-500 fill-blue-500 absolute left-1" 
            />
          )}
          <span style={{ color: textColor }} className="text-center flex-1">{rowNumber}</span>
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column, index) => {
        const columnWidth = getColumnWidth(column);
        const isLastColumn = index === columns.length - 1;
        const isCurrentSegmentName = currentSegmentId === item.id && 
          (column.key === 'segmentName' || column.key === 'name');
        
        return (
          <td
            key={column.id}
            className="align-middle"
            style={{ 
              width: columnWidth, 
              backgroundColor: isCurrentSegmentName ? 'transparent' : backgroundColor,
              borderRight: '1px solid hsl(var(--border))'
            }}
          >
            <div 
              className={isCurrentSegmentName ? 'bg-blue-600 text-white rounded px-2 py-1' : ''}
              style={{ 
                width: '100%',
                minHeight: '24px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <CellRenderer
                column={column}
                item={item}
                cellRefs={cellRefs}
                textColor={isCurrentSegmentName ? '#ffffff' : textColor}
                backgroundColor="transparent"
                currentSegmentId={currentSegmentId}
                columnExpandState={columnExpandState}
                onUpdateItem={onUpdateItem}
                onCellClick={onCellClick}
                onKeyDown={onKeyDown}
                markActiveTyping={markActiveTyping}
                width={columnWidth}
              />
            </div>
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
