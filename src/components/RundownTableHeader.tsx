
import React from 'react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';
import { Separator } from '@/components/ui/separator';

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
        <th className="px-4 py-3 text-left text-sm font-semibold text-white relative" style={{ width: '60px' }}>
          #
          <Separator orientation="vertical" className="absolute right-0 top-0 h-full bg-gray-500" />
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
        <th className="px-4 py-3 text-left text-sm font-semibold text-white relative" style={{ width: '120px' }}>
          <Separator orientation="vertical" className="absolute left-0 top-0 h-full bg-gray-500" />
          Actions
        </th>
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
