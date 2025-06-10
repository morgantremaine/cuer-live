
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
  console.log('🏷️ Rendering table header with columns:', visibleColumns.map(c => c.name));
  
  return (
    <thead className="bg-blue-600 dark:bg-blue-700 sticky top-0 z-10 border-b-2 border-blue-700">
      <tr className="border-b border-blue-700">
        <th 
          className="px-2 py-3 text-left text-sm font-semibold text-white border-r border-blue-500 bg-blue-600"
          style={{ width: '40px', minWidth: '40px' }}
        >
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
            {column.name || column.key}
          </ResizableColumnHeader>
        ))}
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
