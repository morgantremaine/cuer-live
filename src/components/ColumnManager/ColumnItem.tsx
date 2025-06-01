
import React, { useState } from 'react';
import { GripVertical, Eye, EyeOff, Trash2, Edit, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Column } from '@/hooks/useColumnsManager';

interface ColumnItemProps {
  column: Column;
  index: number;
  draggedColumnIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onToggleVisibility: (columnId: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
}

const ColumnItem = ({
  column,
  index,
  draggedColumnIndex,
  onDragStart,
  onDragOver,
  onDrop,
  onToggleVisibility,
  onDeleteColumn,
  onRenameColumn
}: ColumnItemProps) => {
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');

  const startEditingColumn = (column: Column) => {
    setEditingColumnId(column.id);
    setEditingColumnName(column.name);
  };

  const cancelEditingColumn = () => {
    setEditingColumnId(null);
    setEditingColumnName('');
  };

  const handleRenameColumnSubmit = (columnId: string) => {
    if (editingColumnName.trim() && onRenameColumn) {
      onRenameColumn(columnId, editingColumnName.trim());
      setEditingColumnId(null);
      setEditingColumnName('');
    }
  };

  return (
    <div
      className={`flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded cursor-move ${
        draggedColumnIndex === index ? 'bg-blue-100 dark:bg-blue-900 opacity-50' : 'bg-gray-50 dark:bg-gray-700'
      }`}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
    >
      <div className="flex items-center space-x-2 flex-1">
        <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
        <div className="flex flex-col flex-1">
          {editingColumnId === column.id ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editingColumnName}
                onChange={(e) => setEditingColumnName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleRenameColumnSubmit(column.id);
                  } else if (e.key === 'Escape') {
                    cancelEditingColumn();
                  }
                }}
                className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRenameColumnSubmit(column.id)}
                className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300 h-6 w-6 p-0"
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={cancelEditingColumn}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-900 dark:text-white">{column.name}</span>
              {column.isCustom && onRenameColumn && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => startEditingColumn(column)}
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 h-6 w-6 p-0"
                  title="Rename column"
                >
                  <Edit className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">Width: {column.width}</span>
        </div>
        {!column.isCustom && (
          <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
            Built-in
          </span>
        )}
      </div>
      <div className="flex items-center space-x-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(column.id)}
          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 h-6 w-6 p-0"
        >
          {column.isVisible !== false ? (
            <Eye className="h-3 w-3" />
          ) : (
            <EyeOff className="h-3 w-3" />
          )}
        </Button>
        {column.isCustom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteColumn(column.id)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 h-6 w-6 p-0"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ColumnItem;
