
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
          // Show the header name with duration appended - custom implementation for headers
          const headerName = item.name || '';
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[56px] relative"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth,
                backgroundColor,
                overflow: 'visible'
              }}
            >
              <div 
                className="absolute inset-0 flex items-center whitespace-nowrap" 
                style={{ 
                  zIndex: 10,
                  left: '12px',
                  right: 'auto',
                  width: 'max-content',
                  top: 0,
                  bottom: 0
                }}
              >
                <input
                  ref={(el) => {
                    if (el) {
                      cellRefs.current[`${item.id}-${column.key}`] = el;
                    }
                  }}
                  type="text"
                  value={headerName}
                  onChange={(e) => onUpdateItem(item.id, 'name', e.target.value)}
                  onClick={() => onCellClick(item.id, column.key)}
                  onKeyDown={(e) => onKeyDown(e, item.id, column.key)}
                  className="text-2xl font-bold bg-transparent border-none outline-none resize-none p-0 m-0 w-auto min-w-0"
                  style={{ 
                    color: textColor,
                    fontFamily: 'inherit',
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    lineHeight: '1.2'
                  }}
                  placeholder="Header Title"
                />
                <span 
                  className="text-sm font-medium ml-2 flex-shrink-0" 
                  style={{ color: textColor }}
                >
                  ({headerDuration})
                </span>
              </div>
            </td>
          );
        } else if (column.key === 'duration') {
          // Don't show duration in duration column for headers since it's now part of the header name
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
