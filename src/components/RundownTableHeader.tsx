
import React from 'react';
import { ResizableHeader } from './ResizableHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
}

const RundownTableHeader = React.memo(({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth
}: RundownTableHeaderProps) => {
  return (
    <thead className="bg-blue-600 dark:bg-blue-700 sticky top-0 z-10">
      <tr>
        <th className="px-1 py-2 text-left text-sm font-semibold text-white bg-blue-600 dark:bg-blue-700" style={{ width: '40px' }}>
          #
        </th>
        {visibleColumns.map((column) => (
          <ResizableHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={updateColumnWidth}
          >
            {column.name}
          </ResizableHeader>
        ))}
      </tr>
    </thead>
  );
});

RundownTableHeader.displayName = 'RundownTableHeader';

export default RundownTableHeader;
