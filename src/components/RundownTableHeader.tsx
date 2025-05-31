
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
    <thead className="bg-blue-600 dark:bg-blue-700 sticky top-0 z-10">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-white" style={{ width: '50px' }}>
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
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
