
import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Eye, EyeOff, Trash2, Edit2, Check, X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
  isTeamColumn?: boolean;
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
  const [editingColumn, setEditingColumn] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Filter out team columns - they're handled in TeamCustomColumns component
  const personalColumns = columns.filter(col => 
    !col.isCustom || (col.isCustom && !(col as any).isTeamColumn)
  );

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(personalColumns);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    // Reconstruct full columns array with team columns preserved
    const teamColumns = columns.filter(col => col.isCustom && (col as any).isTeamColumn);
    const reorderedColumns = [...items, ...teamColumns];
    
    onReorderColumns(reorderedColumns);
  };

  const startEditing = (column: Column) => {
    setEditingColumn(column.id);
    setEditingName(column.name);
  };

  const cancelEditing = () => {
    setEditingColumn(null);
    setEditingName('');
  };

  const saveEditing = () => {
    if (editingColumn && editingName.trim() && onRenameColumn) {
      onRenameColumn(editingColumn, editingName.trim());
    }
    setEditingColumn(null);
    setEditingName('');
  };

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-900 dark:text-white">Your Columns</h3>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="columns">
          {(provided) => (
            <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
              {personalColumns.map((column, index) => (
                <Draggable key={column.id} draggableId={column.id} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded-md transition-colors ${
                        snapshot.isDragging ? 'bg-gray-100 dark:bg-gray-600' : ''
                      }`}
                    >
                      <div className="flex items-center space-x-2 flex-1">
                        <div {...provided.dragHandleProps}>
                          <GripVertical className="h-4 w-4 text-gray-400" />
                        </div>
                        
                        {editingColumn === column.id ? (
                          <div className="flex items-center space-x-2 flex-1">
                            <input
                              type="text"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveEditing();
                                if (e.key === 'Escape') cancelEditing();
                              }}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                              autoFocus
                            />
                            <Button variant="ghost" size="sm" onClick={saveEditing} className="h-6 w-6 p-0">
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={cancelEditing} className="h-6 w-6 p-0">
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center space-x-2 flex-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {column.name}
                            </span>
                            {column.isCustom && (
                              <span className="text-xs text-blue-600 dark:text-blue-400">
                                (Custom)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onToggleColumnVisibility(column.id)}
                          className="h-8 w-8 p-0"
                        >
                          {column.isVisible ? (
                            <Eye className="h-4 w-4" />
                          ) : (
                            <EyeOff className="h-4 w-4" />
                          )}
                        </Button>
                        
                        {column.isCustom && column.isEditable && onRenameColumn && editingColumn !== column.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(column)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {column.isCustom && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDeleteColumn(column.id)}
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
};

export default ColumnList;
