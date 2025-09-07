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
        <div className="flex items-center justify-center w-full h-6">
          <span style={{ color: textColor }}>{rowNumber}</span>
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
            className={`align-middle ${isCurrentSegmentName ? 'relative' : ''}`}
            style={{ 
              width: columnWidth, 
              backgroundColor: isCurrentSegmentName ? '#3b82f6' : backgroundColor,
              borderRight: '1px solid hsl(var(--border))'
            }}
          >
            {isCurrentSegmentName ? (
              <div className="flex items-center gap-2">
                <Play className="h-4 w-4 text-white fill-blue-500" />
                <div className="flex-1">
                  <CellRenderer
                    column={column}
                    item={item}
                    cellRefs={cellRefs}
                    textColor="#ffffff"
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
              </div>
            ) : (
              <CellRenderer
                column={column}
                item={item}
                cellRefs={cellRefs}
                textColor={textColor}
                backgroundColor="transparent"
                currentSegmentId={currentSegmentId}
                columnExpandState={columnExpandState}
                onUpdateItem={onUpdateItem}
                onCellClick={onCellClick}
                onKeyDown={onKeyDown}
                markActiveTyping={markActiveTyping}
                width={columnWidth}
              />
            )}
          </td>
        );
      })}
    </>
  );
};

export default RegularRowContent;
