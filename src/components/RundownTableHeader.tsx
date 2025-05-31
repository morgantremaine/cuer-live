
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
    <thead className="bg-gray-700 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600 sticky top-0 z-10">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-white border border-gray-500" style={{ width: '60px' }}>
          #
        </th>
        {visibleColumns.map((column, index) => (
          <ResizableColumnHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={updateColumnWidth}
            showLeftSeparator={index > 0}
          >
            {column.name}
          </ResizableColumnHeader>
        ))}
        <th className="px-4 py-3 text-left text-sm font-semibold text-white border border-gray-500" style={{ width: '120px' }}>
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
