
import React, { useState } from 'react';
import { Save, FolderOpen, Edit, RefreshCw, Trash2, Check, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Column } from '@/hooks/useColumnsManager';

interface LayoutManagerProps {
  columns: Column[];
  savedLayouts: any[];
  loading: boolean;
  onSaveLayout: (name: string, columns: Column[]) => Promise<void>;
  onUpdateLayout: (layoutId: string, layoutName: string, columns: Column[]) => Promise<void>;
  onRenameLayout: (layoutId: string, newName: string) => Promise<void>;
  onDeleteLayout: (layoutId: string) => Promise<void>;
  onLoadLayout: (layout: any) => void;
}

const LayoutManager = ({
  columns,
  savedLayouts,
  loading,
  onSaveLayout,
  onUpdateLayout,
  onRenameLayout,
  onDeleteLayout,
  onLoadLayout
}: LayoutManagerProps) => {
  const [layoutName, setLayoutName] = useState('');
  const [showSaveLayout, setShowSaveLayout] = useState(false);
  const [showLoadLayout, setShowLoadLayout] = useState(false);
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');

  const handleSaveLayout = async () => {
    if (layoutName.trim()) {
      try {
        await onSaveLayout(layoutName.trim(), columns);
        setLayoutName('');
        setShowSaveLayout(false);
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleUpdateLayout = async (layoutId: string, layoutNameToUpdate: string) => {
    try {
      await onUpdateLayout(layoutId, layoutNameToUpdate, columns);
    } catch (error) {
      // Error handled by the hook
    }
  };

  const handleRenameLayout = async (layoutId: string, newName: string) => {
    if (newName.trim()) {
      try {
        await onRenameLayout(layoutId, newName.trim());
        setEditingLayoutId(null);
        setEditingLayoutName('');
      } catch (error) {
        // Error handled by the hook
      }
    }
  };

  const handleLoadLayout = (layout: any) => {
    onLoadLayout(layout);
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

  return (
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
                        onClick={() => onDeleteLayout(layout.id)}
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
  );
};

export default LayoutManager;
