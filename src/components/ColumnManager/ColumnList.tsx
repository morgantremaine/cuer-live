
import React, { useState } from 'react';
import ColumnItem from './ColumnItem';
import { Column } from '@/hooks/useColumnsManager';

interface ColumnListProps {
  columns: Column[];
  onReorderColumns: (columns: Column[]) => void;
  onToggleColumnVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
}

const ColumnList = React.memo(({
  columns,
  onReorderColumns,
  onToggleColumnVisibility,
  onDeleteColumn,
  onRenameColumn
}: ColumnListProps) => {
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
      setDraggedColumnIndex(null);
      return;
    }

    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedColumnIndex];
    
    newColumns.splice(draggedColumnIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);
    
    onReorderColumns(newColumns);
    setDraggedColumnIndex(null);
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Column Order & Visibility</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {columns.map((column, index) => (
          <ColumnItem
            key={`column-list-item-${column.id}`} // Stable key based on column ID
            column={column}
            index={index}
            draggedColumnIndex={draggedColumnIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onToggleVisibility={onToggleColumnVisibility}
            onDeleteColumn={onDeleteColumn}
            onRenameColumn={onRenameColumn}
          />
        ))}
      </div>
    </div>
  );
});

ColumnList.displayName = 'ColumnList';

export default ColumnList;
