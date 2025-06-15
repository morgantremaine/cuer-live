
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
      {/* Row number column - increased height for headers */}
      <td 
        className="px-2 py-4 text-base font-mono align-middle border border-border w-16 min-w-16"
        style={{ backgroundColor }}
      >
        <span style={{ color: textColor }}>{rowNumber}</span>
      </td>
      {/* Dynamic columns */}
      {columns.map((column) => {
        const columnWidth = getColumnWidth(column);
        
        // Special handling for headers - only show specific fields
        if (column.key === 'segmentName' || column.key === 'name') {
          // Show the header name with larger text
          return (
            <td
              key={column.id}
              className="align-middle border border-border py-4"
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
        } else if (column.key === 'duration') {
          // Show the calculated header duration in parentheses
          return (
            <td
              key={column.id}
              className="align-middle border border-border px-2 py-4"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                backgroundColor 
              }}
            >
              <div className="break-words whitespace-pre-wrap text-base text-gray-600 dark:text-gray-300" style={{ color: textColor }}>
                ({headerDuration})
              </div>
            </td>
          );
        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
          // Don't show time fields for headers - empty cell
          return (
            <td
              key={column.id}
              className="align-middle border border-border py-4"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                backgroundColor 
              }}
            >
              <div className="px-2"></div>
            </td>
          );
        } else {
          // For other columns, show empty cell for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border py-4"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                backgroundColor 
              }}
            >
              <div className="px-2"></div>
            </td>
          );
        }
      })}
    </>
  );
};

export default HeaderRowContent;
