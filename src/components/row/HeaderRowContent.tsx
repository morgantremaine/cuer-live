
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
        className="px-3 py-8 text-lg font-mono font-semibold align-middle border border-border min-h-[120px]"
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
          // Show the header name with duration appended - simple flowing layout
          const headerName = item.name || '';
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[120px] relative"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth,
                backgroundColor,
                overflow: 'visible'
              }}
            >
              <div 
                className="px-3 py-8 whitespace-nowrap flex items-center"
                style={{ 
                  position: 'relative',
                  zIndex: 10,
                  display: 'flex',
                  minWidth: '100%'
                }}
              >
                <span className="text-lg font-bold" style={{ color: textColor }}>
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
                    className="bg-transparent border-none outline-none text-lg font-bold"
                    style={{ 
                      color: textColor,
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      lineHeight: 'inherit',
                      width: 'fit-content',
                      padding: 0,
                      margin: 0
                    }}
                    size={headerName.length || 1}
                  />
                  <span 
                    className="text-base font-medium" 
                    style={{ color: textColor }}
                  >
                    ({headerDuration})
                  </span>
                </span>
              </div>
            </td>
          );
        } else if (column.key === 'duration') {
          // Don't show duration in duration column for headers since it's now part of the header name
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[120px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="px-3 py-8"></div>
            </td>
          );
        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
          // Don't show time fields for headers - empty cell
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[120px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="px-3 py-8"></div>
            </td>
          );
        } else {
          // For other columns, show empty cell for headers
          return (
            <td
              key={column.id}
              className="align-middle border border-border min-h-[120px]"
              style={{ 
                width: columnWidth, 
                minWidth: columnWidth,
                maxWidth: columnWidth, // Ensure exact width matching
                backgroundColor 
              }}
            >
              <div className="px-3 py-8"></div>
            </td>
          );
        }
      })}
    </>
  );
};

export default HeaderRowContent;
