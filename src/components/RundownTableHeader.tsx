
import React from 'react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth
}: RundownTableHeaderProps) => {
  return (
    <thead className="bg-blue-600 dark:bg-blue-700">
      <tr>
        {/* Row number column - matches the structure in RundownTable */}
        <th className="px-2 py-3 text-left text-sm font-semibold text-white border-r border-blue-500 bg-blue-600 w-16 min-w-16">
          #
        </th>
        {/* Dynamic columns */}
        {visibleColumns.map((column, index) => {
          const columnWidth = getColumnWidth(column);
          
          return (
            <ResizableColumnHeader
              key={column.id}
              column={column}
              width={columnWidth}
              onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
              showLeftSeparator={index > 0}
            >
              {column.name || column.key}
            </ResizableColumnHeader>
          );
        })}
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
