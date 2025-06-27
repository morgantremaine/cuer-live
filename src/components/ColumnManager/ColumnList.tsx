
import React from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState } from 'react';

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
  isTeamColumn?: boolean;
  createdBy?: string;
}

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
  const [draggedColumnId, setDraggedColumnId] = useState<string | null>(null);
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedColumnId) {
      setDropIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Only clear drop index if we're leaving the container entirely
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setDropIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedColumnId) return;
    
    const draggedIndex = columns.findIndex(col => col.id === draggedColumnId);
    if (draggedIndex === -1) return;
    
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(targetIndex, 0, draggedColumn);
    
    onReorderColumns(newColumns);
    setDraggedColumnId(null);
    setDropIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedColumnId(null);
    setDropIndex(null);
  };

  const handleEditStart = (column: Column) => {
    setEditingColumnId(column.id);
    setEditingName(column.name);
  };

  const handleEditSave = (columnId: string) => {
    if (onRenameColumn && editingName.trim()) {
      onRenameColumn(columnId, editingName.trim());
    }
    setEditingColumnId(null);
    setEditingName('');
  };

  const handleEditCancel = () => {
    setEditingColumnId(null);
    setEditingName('');
  };

  const handleKeyDown = (e: React.KeyboardEvent, columnId: string) => {
    if (e.key === 'Enter') {
      handleEditSave(columnId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Column Order & Visibility</h3>
      <div className="space-y-1 max-h-64 overflow-y-auto">
        {columns.map((column, index) => (
          <React.Fragment key={column.id}>
            {/* Drop indicator line */}
            {dropIndex === index && (
              <div className="h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" />
            )}
            
            <div
              className={`flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md ${
                draggedColumnId === column.id ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={handleDragOver}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
            >
              <GripVertical className="h-4 w-4 text-gray-400 cursor-move" />
              
              <div className="flex-1 flex items-center space-x-2">
                {editingColumnId === column.id ? (
                  <Input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onBlur={() => handleEditSave(column.id)}
                    onKeyDown={(e) => handleKeyDown(e, column.id)}
                    className="text-sm h-6 px-2"
                    autoFocus
                  />
                ) : (
                  <div className="flex items-center space-x-2 flex-1">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {column.name}
                    </span>
                    {(column as any).isTeamColumn && (
                      <Users className="h-3 w-3 text-blue-500" />
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-1">
                {column.isCustom && onRenameColumn && editingColumnId !== column.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEditStart(column)}
                    className="h-6 w-6 p-0"
                  >
                    <Edit2 className="h-3 w-3" />
                  </Button>
                )}

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onToggleColumnVisibility(column.id)}
                  className="h-6 w-6 p-0"
                >
                  {column.isVisible !== false ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </Button>

                {column.isCustom && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDeleteColumn(column.id)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </React.Fragment>
        ))}
        
        {/* Final drop indicator */}
        {dropIndex === columns.length && (
          <div className="h-0.5 bg-gray-400 dark:bg-gray-500 rounded-full animate-pulse" />
        )}
      </div>
    </div>
  );
};

export default ColumnList;
