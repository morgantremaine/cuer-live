
import React, { useState } from 'react';
import { GripVertical, Eye, EyeOff, Trash2, Edit, Check, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Column } from '@/types/columns';

interface ColumnItemProps {
  column: Column;
  index: number;
  draggedColumnIndex: number | null;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
  onDragEnd?: () => void;
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
  onDragEnd,
  onToggleVisibility,
  onDeleteColumn,
  onRenameColumn
}: ColumnItemProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(column.name);

  const isDragging = draggedColumnIndex === index;
  const isVisible = column.isVisible !== false;

  const handleStartEdit = () => {
    setIsEditing(true);
    setEditName(column.name);
  };

  const handleSaveEdit = () => {
    if (onRenameColumn && editName.trim() && editName.trim() !== column.name) {
      onRenameColumn(column.id, editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditName(column.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded-md
        ${isDragging ? 'opacity-50 bg-blue-50 dark:bg-blue-900/20 scale-105' : 'bg-white dark:bg-gray-700'}
        ${!isVisible ? 'opacity-60' : ''}
        hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-200
      `}
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onDragEnd={onDragEnd}
    >
      <div className="flex items-center flex-1 min-w-0">
        <div title="Drag to reorder" className="cursor-grab active:cursor-grabbing">
          <GripVertical className="h-4 w-4 text-gray-400 mr-2" />
        </div>
        
        {isEditing ? (
          <div className="flex items-center flex-1 space-x-2">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-500 rounded bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
              autoFocus
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSaveEdit}
              className="text-green-600 hover:text-green-700 dark:text-green-400"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancelEdit}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              <XIcon className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center flex-1 min-w-0">
            <span className="text-sm text-gray-900 dark:text-white truncate">
              {column.name}
            </span>
            {column.isCustom && (
              <span className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                Custom
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center space-x-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onToggleVisibility(column.id)}
          className={`${isVisible ? 'text-blue-500 hover:text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
          title={isVisible ? 'Hide column' : 'Show column'}
        >
          {isVisible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>

        {onRenameColumn && !isEditing && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleStartEdit}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="Rename column"
          >
            <Edit className="h-3 w-3" />
          </Button>
        )}

        {column.isCustom && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDeleteColumn(column.id)}
            className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            title="Delete custom column"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default ColumnItem;
