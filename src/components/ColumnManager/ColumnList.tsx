import React from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';

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
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);
  const cleanupTimeoutRef = useRef<NodeJS.Timeout>();

  // Cleanup function to reset all drag states
  const resetDragState = () => {
    setDraggedColumnId(null);
    setDropTargetIndex(null);
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
  };

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
    
    // Set a cleanup timeout as failsafe
    cleanupTimeoutRef.current = setTimeout(() => {
      console.warn('Drag cleanup timeout triggered');
      resetDragState();
    }, 10000);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    if (draggedColumnId) {
      // Simplified drop position calculation based on mouse position
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      // Insert before or after based on mouse position
      const targetIndex = mouseY < rowMiddle ? index : index + 1;
      setDropTargetIndex(targetIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Improved boundary detection - only clear if truly leaving the container
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    // Add buffer zone to prevent flickering
    const buffer = 10;
    if (x < rect.left - buffer || x > rect.right + buffer || 
        y < rect.top - buffer || y > rect.bottom + buffer) {
      setDropTargetIndex(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedColumnId) {
      resetDragState();
      return;
    }
    
    const draggedIndex = columns.findIndex(col => col.id === draggedColumnId);
    if (draggedIndex === -1) {
      resetDragState();
      return;
    }
    
    // Use the drop target index if available, otherwise fall back to target index
    let dropIndex = dropTargetIndex !== null ? dropTargetIndex : targetIndex;
    
    // Prevent dropping in the same position
    if (draggedIndex === dropIndex || (draggedIndex + 1 === dropIndex)) {
      resetDragState();
      return;
    }
    
    // Adjust drop index if dragging from before to after
    if (draggedIndex < dropIndex) {
      dropIndex--;
    }
    
    const newColumns = [...columns];
    const [draggedColumn] = newColumns.splice(draggedIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);
    
    onReorderColumns(newColumns);
    resetDragState();
  };

  const handleDragEnd = () => {
    // Always cleanup on drag end
    resetDragState();
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
      <div className="space-y-1 max-h-64 overflow-y-auto" onDragLeave={handleDragLeave}>
        {columns.map((column, index) => (
          <React.Fragment key={column.id}>
            {/* Drop indicator */}
            {dropTargetIndex === index && (
              <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
            )}
            
            <div
              className={`flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md transition-opacity ${
                draggedColumnId === column.id ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={(e) => handleDragOver(e, index)}
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
            
            {/* Drop indicator at the end */}
            {dropTargetIndex === columns.length && index === columns.length - 1 && (
              <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default ColumnList;
