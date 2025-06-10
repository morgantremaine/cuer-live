
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
        <th className="px-1 py-2 text-left text-sm font-semibold text-white" style={{ width: '40px' }}>
          #
        </th>
        {visibleColumns.map((column, index) => (
          <ResizableColumnHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
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
