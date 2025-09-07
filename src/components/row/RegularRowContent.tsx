import React from 'react';
import { Play } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';
import { getMinimumWidth } from '@/utils/columnSizing';

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
      <td 
        className="px-2 py-1 text-sm font-mono align-middle"
        style={{ 
          width: '64px',
          minWidth: '64px',
          maxWidth: '64px',
          borderRight: '1px solid hsl(var(--border))'
        }}
      >
        <div className="flex items-center justify-center relative w-full">
          {isCurrentlyPlaying && (
            <Play 
              className="h-6 w-6 text-blue-500 fill-blue-500 absolute left-0" 
            />
          )}
          <span style={{ color: textColor }} className={isCurrentlyPlaying ? 'ml-5' : ''}>{rowNumber}</span>
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column, index) => {
        const columnWidth = getColumnWidth(column);
        const isLastColumn = index === columns.length - 1;
        const isCurrentSegmentName = currentSegmentId === item.id && 
          (column.key === 'segmentName' || column.key === 'name');
        
        // Normalize width to enforce the same minimums as the header
        const rawWidth = parseInt(columnWidth.replace('px', ''));
        const normalizedWidth = `${Math.max(isNaN(rawWidth) ? 0 : rawWidth, getMinimumWidth(column))}px`;
        
        return (
          <td
            key={column.id}
            className={`align-middle ${isCurrentSegmentName ? 'relative' : ''}`}
            style={{ 
              width: normalizedWidth,
              minWidth: normalizedWidth,
              maxWidth: normalizedWidth,
              backgroundColor: isCurrentSegmentName ? '#3b82f6' : 'transparent',
              borderRight: isLastColumn ? 'none' : '1px solid hsl(var(--border))'
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
              width={normalizedWidth}
            />
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
