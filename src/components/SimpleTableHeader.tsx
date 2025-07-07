import React from 'react';
import { Column } from '@/hooks/useColumnsManager';

interface SimpleTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
}

const SimpleTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth
}: SimpleTableHeaderProps) => {
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
        
        {/* Simple columns without DND */}
        {visibleColumns.map((column, index) => {
          const columnWidth = getColumnWidth(column);
          
          return (
            <th
              key={column.id}
              className="px-2 py-1 text-left text-sm font-semibold text-white border-r border-border"
              style={{ 
                width: columnWidth,
                minWidth: columnWidth,
                maxWidth: columnWidth
              }}
            >
              <div className="truncate pr-2 overflow-hidden text-ellipsis whitespace-nowrap">
                {column.name || column.key}
              </div>
            </th>
          );
        })}
      </tr>
    </thead>
  );
};

export default SimpleTableHeader;