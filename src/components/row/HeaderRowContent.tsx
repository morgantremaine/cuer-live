
import React from 'react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/hooks/useColumnsManager';
import { getContrastTextColor } from '@/utils/colorUtils';

interface HeaderRowContentProps {
  item: RundownItem;
  columns: Column[];
  headerDuration: string;
  rowNumber: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  getColumnWidth: (column: Column) => string;
}

const HeaderRowContent = ({
  item,
  columns,
  headerDuration,
  rowNumber,
  backgroundColor,
  currentSegmentId,
  cellRefs,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  getColumnWidth
}: HeaderRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-3 py-3 text-base font-mono font-semibold align-middle border border-border min-h-[56px]"
        style={{ 
          backgroundColor,
          width: '64px',
          minWidth: '64px', 
          maxWidth: '64px' // Ensure exact width matching
        }}
      >
        <span style={{ color: textColor }}>{rowNumber}</span>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        const widthValue = parseInt(columnWidth.replace('px', ''));
        
        // Special handling for headers - only show specific fields
        if (column.key === 'segmentName' || column.key === 'name') {
          // Show the header name - this is the editable field for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px] relative"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                backgroundColor,
                position: 'relative',
                zIndex: 1
              }}
            >
              <div 
                className="px-3 py-3 text-2xl font-bold absolute top-0 left-0 h-full flex items-center"
                style={{ 
                  color: textColor,
                  whiteSpace: 'nowrap',
                  zIndex: 10,
                  minWidth: 'max-content',
                  width: 'max-content'
                }}
              >
                <CellRenderer
                  column={column}
                  item={item}
                  cellRefs={cellRefs}
                  textColor={textColor}
                  backgroundColor={backgroundColor}
                  currentSegmentId={currentSegmentId}
                  onUpdateItem={onUpdateItem}
                  onCellClick={onCellClick}
                  onKeyDown={onKeyDown}
                  width={columnWidth}
                />
              </div>
            </td>
          );
        } else if (column.key === 'duration') {
          // Show the calculated header duration in parentheses - remove overflow hidden to prevent truncation
          return (
            <td
              key={column.id}
              className="align-middle border border-border px-3 py-3 min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="text-sm font-medium text-gray-600 dark:text-gray-300 whitespace-nowrap" style={{ color: textColor }}>
                ({headerDuration})
              </div>
            </td>
          );
        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
          // Don't show time fields for headers - empty cell
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="px-3 py-3"></div>
            </td>
          );
        } else {
          // For other columns, show empty cell for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="px-3 py-3"></div>
            </td>
          );
        }
      })}
    </>
  );
};

export default HeaderRowContent;
