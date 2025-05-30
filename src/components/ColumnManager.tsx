
import React, { useState } from 'react';
import { X, Plus, GripVertical, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
}

interface ColumnManagerProps {
  columns: Column[];
  onAddColumn: (name: string) => void;
  onReorderColumns: (columns: Column[]) => void;
  onDeleteColumn: (columnId: string) => void;
  onClose: () => void;
}

const ColumnManager = ({ columns, onAddColumn, onReorderColumns, onDeleteColumn, onClose }: ColumnManagerProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
    }
  };

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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">Manage Columns</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Add New Column</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                placeholder="Column name"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Button onClick={handleAddColumn} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Column Order</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className={`flex items-center justify-between p-2 border rounded cursor-move ${
                    draggedColumnIndex === index ? 'bg-blue-100 opacity-50' : 'bg-gray-50'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="flex items-center space-x-2">
                    <GripVertical className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">{column.name}</span>
                    {!column.isCustom && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        Built-in
                      </span>
                    )}
                  </div>
                  {column.isCustom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteColumn(column.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ColumnManager;
