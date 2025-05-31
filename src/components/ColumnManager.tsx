
import React, { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Eye, EyeOff, Save, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';

interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
}

interface ColumnManagerProps {
  columns: Column[];
  onAddColumn: (name: string) => void;
  onReorderColumns: (columns: Column[]) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleColumnVisibility: (columnId: string) => void;
  onLoadLayout: (columns: Column[]) => void;
  onClose: () => void;
}

const ColumnManager = ({ 
  columns, 
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onClose 
}: ColumnManagerProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [showSaveLayout, setShowSaveLayout] = useState(false);
  const [showLoadLayout, setShowLoadLayout] = useState(false);
  
  const { savedLayouts, loading, saveLayout, deleteLayout } = useColumnLayoutStorage();

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
    }
  };

  const handleSaveLayout = async () => {
    if (layoutName.trim()) {
      try {
        // Save columns with their current widths
        await saveLayout(layoutName.trim(), columns);
        setLayoutName('');
        setShowSaveLayout(false);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleLoadLayout = (layout: any) => {
    // Load layout columns with preserved widths
    onLoadLayout(layout.columns);
    setShowLoadLayout(false);
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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-600">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Manage Columns</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="p-4 space-y-4">
          {/* Layout Management */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Column Layouts</h3>
            <div className="flex space-x-2">
              <Button 
                onClick={() => setShowSaveLayout(!showSaveLayout)} 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-1"
              >
                <Save className="h-3 w-3" />
                <span>Save Layout</span>
              </Button>
              <Button 
                onClick={() => setShowLoadLayout(!showLoadLayout)} 
                variant="outline" 
                size="sm"
                className="flex items-center space-x-1"
              >
                <FolderOpen className="h-3 w-3" />
                <span>Load Layout</span>
              </Button>
            </div>

            {showSaveLayout && (
              <div className="flex space-x-2 mt-2">
                <input
                  type="text"
                  value={layoutName}
                  onChange={(e) => setLayoutName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveLayout()}
                  placeholder="Layout name"
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
                <Button onClick={handleSaveLayout} size="sm">
                  Save
                </Button>
              </div>
            )}

            {showLoadLayout && (
              <div className="max-h-32 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
                {loading ? (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading...</div>
                ) : savedLayouts.length === 0 ? (
                  <div className="p-2 text-sm text-gray-500 dark:text-gray-400">No saved layouts</div>
                ) : (
                  savedLayouts.map((layout) => (
                    <div
                      key={layout.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                    >
                      <button
                        onClick={() => handleLoadLayout(layout)}
                        className="flex-1 text-left text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                      >
                        {layout.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteLayout(layout.id)}
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Add New Column */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Add New Column</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newColumnName}
                onChange={(e) => setNewColumnName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddColumn()}
                placeholder="Column name"
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <Button onClick={handleAddColumn} size="sm">
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Column Order & Visibility */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white">Column Order & Visibility</h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {columns.map((column, index) => (
                <div
                  key={column.id}
                  className={`flex items-center justify-between p-2 border border-gray-200 dark:border-gray-600 rounded cursor-move ${
                    draggedColumnIndex === index ? 'bg-blue-100 dark:bg-blue-900 opacity-50' : 'bg-gray-50 dark:bg-gray-700'
                  }`}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                >
                  <div className="flex items-center space-x-2">
                    <GripVertical className="h-4 w-4 text-gray-400 dark:text-gray-500" />
                    <div className="flex flex-col">
                      <span className="text-sm text-gray-900 dark:text-white">{column.name}</span>
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
                      onClick={() => onToggleColumnVisibility(column.id)}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
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
                        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-600">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ColumnManager;
