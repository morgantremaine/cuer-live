
import React, { useState } from 'react';
import { X, Plus, GripVertical, Trash2, Eye, EyeOff, Save, FolderOpen, Edit, RefreshCw, Check, XIcon } from 'lucide-react';
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
  onRenameColumn?: (columnId: string, newName: string) => void;
  onClose: () => void;
}

const ColumnManager = ({ 
  columns, 
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onRenameColumn,
  onClose 
}: ColumnManagerProps) => {
  const [newColumnName, setNewColumnName] = useState('');
  const [draggedColumnIndex, setDraggedColumnIndex] = useState<number | null>(null);
  const [layoutName, setLayoutName] = useState('');
  const [showSaveLayout, setShowSaveLayout] = useState(false);
  const [showLoadLayout, setShowLoadLayout] = useState(false);
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnName, setEditingColumnName] = useState('');
  
  const { savedLayouts, loading, saveLayout, updateLayout, renameLayout, deleteLayout } = useColumnLayoutStorage();

  const handleAddColumn = () => {
    if (newColumnName.trim()) {
      onAddColumn(newColumnName.trim());
      setNewColumnName('');
    }
  };

  const handleSaveLayout = async () => {
    if (layoutName.trim()) {
      try {
        await saveLayout(layoutName.trim(), columns);
        setLayoutName('');
        setShowSaveLayout(false);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleUpdateLayout = async (layoutId: string, layoutNameToUpdate: string) => {
    try {
      await updateLayout(layoutId, layoutNameToUpdate, columns);
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleRenameLayout = async (layoutId: string, newName: string) => {
    if (newName.trim()) {
      try {
        await renameLayout(layoutId, newName.trim());
        setEditingLayoutId(null);
        setEditingLayoutName('');
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleLoadLayout = (layout: any) => {
    onLoadLayout(layout.columns);
    setShowLoadLayout(false);
  };

  const startEditingLayout = (layout: any) => {
    setEditingLayoutId(layout.id);
    setEditingLayoutName(layout.name);
  };

  const cancelEditingLayout = () => {
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

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
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
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
              <div className="max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md">
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
                      {editingLayoutId === layout.id ? (
                        <div className="flex-1 flex items-center space-x-2">
                          <input
                            type="text"
                            value={editingLayoutName}
                            onChange={(e) => setEditingLayoutName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                handleRenameLayout(layout.id, editingLayoutName);
                              } else if (e.key === 'Escape') {
                                cancelEditingLayout();
                              }
                            }}
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRenameLayout(layout.id, editingLayoutName)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditingLayout}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleLoadLayout(layout)}
                            className="flex-1 text-left text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400"
                          >
                            {layout.name}
                          </button>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => startEditingLayout(layout)}
                              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                              title="Rename layout"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUpdateLayout(layout.id, layout.name)}
                              className="text-orange-500 hover:text-orange-700 dark:text-orange-400 dark:hover:text-orange-300"
                              title="Update layout with current columns"
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteLayout(layout.id)}
                              className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                              title="Delete layout"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </>
                      )}
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
                            className="flex-1 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRenameColumnSubmit(column.id)}
                            className="text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={cancelEditingColumn}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <XIcon className="h-3 w-3" />
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
                              className="text-blue-500 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
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
