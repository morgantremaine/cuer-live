
import React, { useEffect } from 'react';
import { ResizableColumnHeader } from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => number;
  onColumnWidthChange: (columnId: string, width: number) => void;
  initializeWidths: () => void;
}

const RundownTableHeader = React.memo(({
  visibleColumns,
  getColumnWidth,
  onColumnWidthChange,
  initializeWidths
}: RundownTableHeaderProps) => {
  // Initialize widths when columns change
  useEffect(() => {
    initializeWidths();
  }, [initializeWidths]);

  return (
    <thead className="bg-blue-600 dark:bg-blue-700 sticky top-0 z-10">
      <tr>
        <th 
          className="px-2 py-3 text-left text-sm font-semibold text-white bg-blue-600 dark:bg-blue-700" 
          style={{ width: '50px', minWidth: '50px' }}
        >
          #
        </th>
        {visibleColumns.map((column) => (
          <ResizableColumnHeader
            key={column.id}
            column={column}
            width={getColumnWidth(column)}
            onWidthChange={onColumnWidthChange}
          >
            {column.name}
          </ResizableColumnHeader>
        ))}
      </tr>
    </thead>
  );
});

RundownTableHeader.displayName = 'RundownTableHeader';

export default RundownTableHeader;
