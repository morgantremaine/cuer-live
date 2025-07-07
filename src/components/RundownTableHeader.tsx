
import React from 'react';
import ResizableColumnHeader from './ResizableColumnHeader';
import { Column } from '@/hooks/useColumnsManager';
import { useColumnDragDrop } from '@/hooks/useColumnDragDrop';

interface RundownTableHeaderProps {
  visibleColumns: Column[];
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  onReorderColumns?: (columns: Column[]) => void;
}

const RundownTableHeader = ({
  visibleColumns,
  getColumnWidth,
  updateColumnWidth,
  onReorderColumns
}: RundownTableHeaderProps) => {
  const {
    draggedColumnId,
    dropTargetIndex,
    isDragging,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleDragEnd
  } = useColumnDragDrop(visibleColumns, onReorderColumns);

  return (
    <thead className="bg-blue-600 dark:bg-blue-700">
      <tr>
        {/* Row number column - static, not draggable */}
        <th 
          className="px-2 py-1 text-left text-sm font-semibold text-white bg-blue-600"
          style={{ 
            width: '64px', 
            minWidth: '64px',
            maxWidth: '64px',
            borderRight: '1px solid hsl(var(--border))'
          }}
        >
          #
        </th>
        
        {/* Dynamic columns */}
        {visibleColumns.map((column, index) => {
          const columnWidth = getColumnWidth(column);
          const isColumnDragging = isDragging(column.id);
          
          return (
            <React.Fragment key={column.id}>
              {/* Drop indicator before column */}
              {dropTargetIndex === index && (
                <th className="p-0 bg-blue-600 relative">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-300 z-10" />
                </th>
              )}
              
              <ResizableColumnHeader
                column={column}
                width={columnWidth}
                onWidthChange={(columnId: string, width: number) => updateColumnWidth(columnId, width)}
                showLeftSeparator={index > 0}
                isDragging={isColumnDragging}
                onDragStart={(e) => handleDragStart(e, column, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
              >
                {column.name || column.key}
              </ResizableColumnHeader>
              
              {/* Drop indicator after last column */}
              {dropTargetIndex === visibleColumns.length && index === visibleColumns.length - 1 && (
                <th className="p-0 bg-blue-600 relative">
                  <div className="absolute right-0 top-0 bottom-0 w-1 bg-blue-300 z-10" />
                </th>
              )}
            </React.Fragment>
          );
        })}
      </tr>
    </thead>
  );
};

export default RundownTableHeader;
