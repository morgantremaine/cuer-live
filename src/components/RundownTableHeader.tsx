
import React, { useEffect } from 'react';
import { ResizableColumnHeader } from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';
import { useColumnResizing } from '@/hooks/useColumnResizing';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  onColumnWidthChange: (columnId: string, width: number) => void;
}

const RundownTableHeader = React.memo(({
  visibleColumns,
  onColumnWidthChange
}: RundownTableHeaderProps) => {
  const {
    getColumnWidth,
    updateColumnWidth,
    initializeWidths
  } = useColumnResizing(visibleColumns, onColumnWidthChange);

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
            onWidthChange={updateColumnWidth}
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
