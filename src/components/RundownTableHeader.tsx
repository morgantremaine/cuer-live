
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
    <thead className="bg-gray-700 dark:bg-gray-800 border-b-2 border-gray-200 dark:border-gray-600">
      <tr>
        <th className="px-4 py-3 text-left text-sm font-semibold text-white" style={{ width: '60px' }}>#</th>
        {visibleColumns.map((column) => (
          <ResizableColumnHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={updateColumnWidth}
          >
            {column.name}
          </ResizableColumnHeader>
        ))}
        <th className="px-4 py-3 text-left text-sm font-semibold text-white" style={{ width: '120px' }}>Actions</th>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
