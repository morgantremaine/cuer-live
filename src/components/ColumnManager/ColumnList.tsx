import React from 'react';
import { Eye, EyeOff, GripVertical, Trash2, Edit2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useState, useRef } from 'react';
import { useDragAutoScroll } from '@/hooks/useDragAutoScroll';
import DeleteColumnDialog from './DeleteColumnDialog';

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [columnToDelete, setColumnToDelete] = useState<Column | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Initialize auto-scroll hook
  const { handleDragAutoScroll, stopAutoScroll } = useDragAutoScroll({
    scrollContainerRef,
    isActive: !!draggedColumnId
  });

  const resetDragState = () => {
    setDraggedColumnId(null);
    setDropTargetIndex(null);
    stopAutoScroll();
  };

  const handleDragStart = (e: React.DragEvent, columnId: string) => {
    setDraggedColumnId(columnId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', columnId);
  };

  const handleEnhancedDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Handle auto-scroll
    handleDragAutoScroll(e);
    
    if (draggedColumnId) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const mouseY = e.clientY;
      const rowMiddle = rect.top + rect.height / 2;
      
      const targetIndex = mouseY < rowMiddle ? index : index + 1;
      setDropTargetIndex(targetIndex);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    const buffer = 15;
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
    
    let dropIndex = dropTargetIndex !== null ? dropTargetIndex : targetIndex;
    
    if (draggedIndex === dropIndex || (draggedIndex + 1 === dropIndex)) {
      resetDragState();
      return;
    }
    
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

  const handleDeleteClick = (column: Column) => {
    setColumnToDelete(column);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (columnToDelete) {
      onDeleteColumn(columnToDelete.id);
      setColumnToDelete(null);
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div
        ref={scrollContainerRef}
        className="space-y-1 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md flex-1" 
        onDragLeave={handleDragLeave}
      >
        {columns.map((column, index) => (
          <div key={column.id}>
            {dropTargetIndex === index && (
              <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
            )}
            
            <div
              className={`flex items-center space-x-2 p-2 bg-gray-50 dark:bg-gray-700 rounded-md transition-opacity ${
                draggedColumnId === column.id ? 'opacity-50' : ''
              }`}
              draggable
              onDragStart={(e) => handleDragStart(e, column.id)}
              onDragOver={(e) => handleEnhancedDragOver(e, index)}
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
                    onClick={() => handleDeleteClick(column)}
                    className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            {dropTargetIndex === columns.length && index === columns.length - 1 && (
              <div className="h-0.5 bg-blue-500 mx-2 rounded-full" />
            )}
          </div>
        ))}
      </div>

      <DeleteColumnDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        columnName={columnToDelete?.name || ''}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  );
};

export default ColumnList;
