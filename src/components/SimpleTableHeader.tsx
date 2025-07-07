import React, { useRef, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface SimpleTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
}

// Define minimum widths for different column types
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 95;
    case 'segmentName':
      return 100;
    case 'talent':
      return 60;
    case 'script':
    case 'notes':
      return 120;
    case 'gfx':
    case 'video':
      return 80;
    default:
      return 50;
  }
};

const SimpleTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth
}: SimpleTableHeaderProps) => {

  const handleColumnResize = useCallback((column: Column, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = parseInt(getColumnWidth(column).replace('px', ''));
    const minimumWidth = getMinimumWidth(column);

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const newWidth = Math.max(minimumWidth, startWidth + deltaX);
      updateColumnWidth(column.id, newWidth);
    };

    const handleMouseUp = () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [getColumnWidth, updateColumnWidth]);

  return (
    <thead className="sticky top-0 z-10">
      <tr className="bg-blue-600 text-white">
        {/* Row number column */}
        <th 
          className="px-2 py-1 text-left text-sm font-semibold text-white"
          style={{ 
            width: '64px',
            minWidth: '64px',
            maxWidth: '64px',
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          #
        </th>
        
        {/* Simple columns with resize handles */}
        {visibleColumns.map((column, index) => {
          const columnWidth = getColumnWidth(column);
          
          return (
            <th
              key={column.id}
              className="px-2 py-1 text-left text-sm font-semibold text-white border-r border-border relative"
              style={{ 
                width: columnWidth,
                minWidth: columnWidth,
                maxWidth: columnWidth
              }}
            >
              <div className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {column.name || column.key}
              </div>
              
              {/* Resize handle */}
              <div 
                className="absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-400 transition-colors z-10"
                onMouseDown={(e) => handleColumnResize(column, e)}
              />
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default SimpleTableHeader;