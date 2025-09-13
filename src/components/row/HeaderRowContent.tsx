import React from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import CellRenderer from '../CellRenderer';
import { RundownItem } from '@/hooks/useRundownItems';
import { Column } from '@/types/columns';
import { getContrastTextColor } from '@/utils/colorUtils';
import { getMinimumWidth } from '@/utils/columnSizing';

interface HeaderRowContentProps {
  item: RundownItem;
  columns: Column[];
  headerDuration: string;
  rowNumber: string;
  backgroundColor?: string;
  currentSegmentId?: string | null;
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>;
  isCollapsed?: boolean;
  onUpdateItem: (id: string, field: string, value: string) => void;
  onCellClick: (itemId: string, field: string) => void;
  onKeyDown: (e: React.KeyboardEvent, itemId: string, field: string) => void;
  onToggleCollapse?: (headerId: string) => void;
  markActiveTyping?: () => void;
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
  isCollapsed = false,
  onUpdateItem,
  onCellClick,
  onKeyDown,
  onToggleCollapse,
  markActiveTyping,
  getColumnWidth
}: HeaderRowContentProps) => {
  // Calculate text color based on background color
  const textColor = backgroundColor ? getContrastTextColor(backgroundColor) : undefined;

  // Handle collapse toggle
  const handleToggleCollapse = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onToggleCollapse) {
      onToggleCollapse(item.id);
    }
  };

  return (
    <>
      {/* Row number column - must match the header structure exactly */}
      <td 
        className="px-2 py-8 text-xl font-mono font-semibold align-middle min-h-[115px]"
        style={{ 
          width: '64px',
          minWidth: '64px', 
          maxWidth: '64px',
          borderRight: backgroundColor ? 'none' : '1px solid hsl(var(--border))'
        }}
      >
        <div className="flex items-center justify-center w-full h-full">
          <button
            onClick={handleToggleCollapse}
            className="flex items-center justify-center p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            title={isCollapsed ? 'Expand header' : 'Collapse header'}
          >
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            ) : (
              <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            )}
          </button>
        </div>
      </td>
      {/* Dynamic columns */}
      {columns.map((column, columnIndex) => {
        const columnWidth = getColumnWidth(column);
        const isLastColumn = columnIndex === columns.length - 1;
        // Normalize width to enforce the same minimums as the header
        const rawWidth = parseFloat(columnWidth.replace('px', ''));
        const normalizedWidth = `${Math.max(isNaN(rawWidth) ? 0 : rawWidth, getMinimumWidth(column))}px`;
        
        // Always show header name and duration in the first column (after row number)
        if (columnIndex === 0) {
          const headerName = item.name || '';
            return (
              <td
                key={column.id}
                className="align-middle min-h-[115px] relative"
                style={{ 
                  width: normalizedWidth,
                  minWidth: normalizedWidth,
                  maxWidth: normalizedWidth,
                  overflow: 'visible',
                  borderRight: (isLastColumn || backgroundColor) ? 'none' : '1px solid hsl(var(--border))'
                }}
            >
              <div 
                className="px-2 py-8 flex items-center"
                style={{ 
                  position: 'relative',
                  zIndex: 10,
                  minWidth: '100%'
                }}
              >
                <span className="inline-flex items-center">
                  <input
                    ref={(el) => {
                      if (el) {
                        cellRefs.current[`${item.id}-name`] = el;
                        // Auto-resize with buffer for cross-browser compatibility
                        const contentLength = headerName.length || 1;
                        const bufferWidth = contentLength + 3; // Add buffer for PC browsers
                        el.style.width = `${bufferWidth}ch`;
                      }
                    }}
                    type="text"
                    value={headerName}
                    onChange={(e) => {
                      markActiveTyping?.();
                      onUpdateItem(item.id, 'name', e.target.value);
                      // Auto-resize on change with buffer
                      const contentLength = e.target.value.length || 1;
                      const bufferWidth = contentLength + 3; // Add buffer for PC browsers
                      e.target.style.width = `${bufferWidth}ch`;
                    }}
                    onClick={() => onCellClick(item.id, 'name')}
                    onKeyDown={(e) => onKeyDown(e, item.id, 'name')}
                    data-field-key={`${item.id}-name`}
                    className="bg-transparent border-none outline-none text-lg font-bold"
                    style={{ 
                      color: textColor,
                      fontFamily: 'inherit',
                      fontSize: 'inherit',
                      fontWeight: 'inherit',
                      lineHeight: 'inherit',
                      padding: 0,
                      margin: 0,
                      width: `${Math.max(headerName.length + 3, 4)}ch`, // Add buffer
                      minWidth: '4ch'
                    }}
                    placeholder="Header Name"
                  />
                  <span 
                    className="text-base font-medium whitespace-nowrap ml-6" 
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
          // BUT show it for print view
          return (
            <td
              key={column.id}
              className="align-middle min-h-[115px]"
              style={{ 
                width: normalizedWidth,
                minWidth: normalizedWidth,
                maxWidth: normalizedWidth,
                borderRight: (isLastColumn || backgroundColor) ? 'none' : '1px solid hsl(var(--border))'
              }}
            >
              <div className="px-2 py-8">
                {/* Show duration in print only */}
                <span className="hidden print:inline-block font-medium">
                  {headerDuration}
                </span>
              </div>
            </td>
          );
        } else if (column.key === 'startTime' || column.key === 'endTime' || column.key === 'elapsedTime') {
          // Don't show time fields for headers - empty cell
          return (
            <td
              key={column.id}
              className="align-middle min-h-[115px]"
              style={{ 
                width: normalizedWidth,
                minWidth: normalizedWidth,
                maxWidth: normalizedWidth,
                borderRight: (isLastColumn || backgroundColor) ? 'none' : '1px solid hsl(var(--border))'
              }}
            >
              <div className="px-2 py-8"></div>
            </td>
          );
        } else {
          // For other columns (including segmentName), show empty cell for headers
          return (
            <td
              key={column.id}
              className="align-middle min-h-[115px]"
              style={{ 
                width: normalizedWidth,
                minWidth: normalizedWidth,
                maxWidth: normalizedWidth,
                borderRight: (isLastColumn || backgroundColor) ? 'none' : '1px solid hsl(var(--border))'
              }}
            >
              <div className="px-2 py-8"></div>
            </td>
          );
        }
      })}
    </>
  );
};

export default HeaderRowContent;
