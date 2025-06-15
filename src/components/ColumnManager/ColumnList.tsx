
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

const ColumnList = ({
  columns,
  onReorderColumns,
  onToggleColumnVisibility,
  onDeleteColumn,
  onRenameColumn
}: ColumnListProps) => {
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    console.log('🔄 ColumnList: Starting drag for column at index:', index, columns[index]?.name);
    setDraggedColumnIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedColumnIndex === null || draggedColumnIndex === dropIndex) {
      console.log('🚫 Invalid drop - same position or no drag in progress');
      setDraggedColumnIndex(null);
      return;
    }

    console.log('📦 ColumnList: Dropping column from index', draggedColumnIndex, 'to index', dropIndex);

    // Create a new array with the reordered columns
    const newColumns = [...columns];
    const draggedColumn = newColumns[draggedColumnIndex];
    
    // Remove the dragged column from its original position
    newColumns.splice(draggedColumnIndex, 1);
    
    // Insert it at the new position
    newColumns.splice(dropIndex, 0, draggedColumn);
    
    console.log('✅ ColumnList: New column order:', newColumns.map(col => col.name));
    
    // Call the reorder handler
    onReorderColumns(newColumns);
    setDraggedColumnIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedColumnIndex(null);
  };

  const handleToggleVisibility = (columnId: string) => {
    console.log('👁️ ColumnList: Toggling visibility for column:', columnId);
    onToggleColumnVisibility(columnId);
  };

  const handleDeleteColumn = (columnId: string) => {
    console.log('🗑️ ColumnList: Deleting column:', columnId);
    onDeleteColumn(columnId);
  };

  const handleRenameColumn = (columnId: string, newName: string) => {
    console.log('✏️ ColumnList: Renaming column:', columnId, 'to:', newName);
    if (onRenameColumn) {
      onRenameColumn(columnId, newName);
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Column Order & Visibility</h3>
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
        Drag columns to reorder them. Use the eye icon to hide/show columns.
      </div>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {columns.map((column, index) => (
          <ColumnItem
            key={column.id}
            column={column}
            index={index}
            draggedColumnIndex={draggedColumnIndex}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onToggleVisibility={handleToggleVisibility}
            onDeleteColumn={handleDeleteColumn}
            onRenameColumn={handleRenameColumn}
          />
        ))}
      </div>
      {columns.length === 0 && (
        <div className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
          No columns available
        </div>
      )}
    </div>
  );
};

export default ColumnList;
