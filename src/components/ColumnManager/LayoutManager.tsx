
import React, { useState } from 'react';
import { Save, FolderOpen, Edit, RefreshCw, Trash2, Check, XIcon, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Column } from '@/hooks/useUserColumnPreferences';

interface LayoutManagerProps {
  columns: Column[];
  savedLayouts: any[];
  loading: boolean;
  onSaveLayout: (name: string, columns: Column[]) => Promise<void>;
  onUpdateLayout: (layoutId: string, layoutName: string, columns: Column[]) => Promise<void>;
  onRenameLayout: (layoutId: string, newName: string) => Promise<void>;
  onDeleteLayout: (layoutId: string) => Promise<void>;
  onLoadLayout: (columns: Column[]) => void;
  canEditLayout?: (layout: any) => boolean;
}

const LayoutManager = ({
  columns,
  savedLayouts,
  loading,
  onSaveLayout,
  onUpdateLayout,
  onRenameLayout,
  onDeleteLayout,
  onLoadLayout,
  canEditLayout
}: LayoutManagerProps) => {
  const [layoutName, setLayoutName] = useState('');
  const [showSaveLayout, setShowSaveLayout] = useState(false);
  const [editingLayoutId, setEditingLayoutId] = useState<string | null>(null);
  const [editingLayoutName, setEditingLayoutName] = useState('');

  const handleSaveLayout = async () => {
    if (layoutName.trim()) {
      try {
        await onSaveLayout(layoutName.trim(), columns);
        setLayoutName('');
        setShowSaveLayout(false);
      } catch (error) {
        console.error('Error saving layout:', error);
      }
    }
  };

  const handleUpdateLayout = async (layoutId: string, layoutNameToUpdate: string) => {
    console.log('🔄 LayoutManager: Updating layout', layoutId, 'with', columns.length, 'current columns');
    console.log('📊 Current columns:', columns.map(c => ({ id: c.id, name: c.name, isVisible: c.isVisible })));
    
    try {
      await onUpdateLayout(layoutId, layoutNameToUpdate, columns);
      console.log('✅ Layout update completed successfully');
    } catch (error) {
      console.error('❌ Error updating layout:', error);
    }
  };

  const handleRenameLayout = async (layoutId: string, newName: string) => {
    if (newName.trim()) {
      try {
        await onRenameLayout(layoutId, newName.trim());
        setEditingLayoutId(null);
        setEditingLayoutName('');
      } catch (error) {
        console.error('Error renaming layout:', error);
      }
    }
  };

  const handleLoadLayout = (layout: any) => {
    console.log('🔄 LayoutManager: Loading layout:', layout);
    
    let columnsToLoad: Column[] = [];
    
    // Handle different layout data formats
    if (Array.isArray(layout.columns)) {
      columnsToLoad = layout.columns;
    } else if (Array.isArray(layout)) {
      columnsToLoad = layout;
    } else {
      console.error('❌ Invalid layout format:', layout);
      return;
    }

    // Validate column structure
    const validColumns = columnsToLoad.filter(col => 
      col && 
      typeof col === 'object' && 
      col.id && 
      col.name && 
      col.key
    );

    if (validColumns.length === 0) {
      console.error('❌ No valid columns found in layout');
      return;
    }

    console.log('✅ LayoutManager: Applying layout as persistent user preference');
    onLoadLayout(validColumns);
  };

  const startEditingLayout = (layout: any) => {
    setEditingLayoutId(layout.id);
    setEditingLayoutName(layout.name);
  };

  const cancelEditingLayout = () => {
    setEditingLayoutId(null);
    setEditingLayoutName('');
  };

  const getCreatorDisplay = (layout: any) => {
    if (layout.creator_profile?.full_name) {
      return layout.creator_profile.full_name;
    }
    if (layout.creator_profile?.email) {
      return layout.creator_profile.email;
    }
    return 'Unknown User';
  };

  // Helper function to count visible columns in a layout
  const getVisibleColumnCount = (layout: any) => {
    if (!Array.isArray(layout.columns)) return 0;
    // Backward-compat: honor both isVisible and visible flags; treat missing as visible
    return layout.columns.filter(col => !(col?.isVisible === false || col?.visible === false)).length;
  };

  const isUserLayout = (layout: any) => {
    return canEditLayout ? canEditLayout(layout) : true;
  };

  // Group layouts by ownership
  const userLayouts = savedLayouts.filter(isUserLayout);
  const teamLayouts = savedLayouts.filter(layout => !isUserLayout(layout));

  return (
    <div className="space-y-2 h-full flex flex-col">
      <div className="flex space-x-2">
        <Button 
          onClick={() => setShowSaveLayout(!showSaveLayout)} 
          variant="outline" 
          size="sm"
          className="flex items-center space-x-1"
        >
          <Save className="h-3 w-3" />
          <span>Save Current Layout As</span>
        </Button>
      </div>

      {showSaveLayout && (
        <div className="flex space-x-2 mt-2 flex-shrink-0">
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

      <div className="overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-md flex-1" style={{ maxHeight: 'calc(100% - 2rem)' }}>
        {loading ? (
          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">Loading layouts...</div>
        ) : savedLayouts.length === 0 ? (
          <div className="p-2 text-sm text-gray-500 dark:text-gray-400">No saved layouts found</div>
        ) : (
          <div className="space-y-1">
            {/* My Layouts Section */}
            {userLayouts.length > 0 && (
              <div>
                <div className="px-2 py-1 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-600">
                  Saved Layouts
                </div>
                {userLayouts.map((layout) => (
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
                          className="flex-1 text-left text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 py-1"
                          title={`Load layout with ${getVisibleColumnCount(layout)} visible columns (${Array.isArray(layout.columns) ? layout.columns.length : 0} total)`}
                        >
                          <div className="font-medium">{layout.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {getVisibleColumnCount(layout)} visible columns
                          </div>
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
                ))}
              </div>
            )}

            {/* Team Layouts Section */}
            {teamLayouts.length > 0 && (
              <div>
                <div className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-xs font-medium text-blue-700 dark:text-blue-300 border-b border-blue-200 dark:border-blue-700">
                  Team Layouts
                </div>
                {teamLayouts.map((layout) => (
                  <div
                    key={layout.id}
                    className="flex items-center justify-between p-2 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <button
                      onClick={() => handleLoadLayout(layout)}
                      className="flex-1 text-left text-sm text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 py-1"
                      title={`Load layout with ${getVisibleColumnCount(layout)} visible columns (${Array.isArray(layout.columns) ? layout.columns.length : 0} total)`}
                    >
                      <div className="font-medium">{layout.name}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
                        <User className="h-3 w-3" />
                        <span>by {getCreatorDisplay(layout)}</span>
                        <span>•</span>
                        <span>{getVisibleColumnCount(layout)} visible columns</span>
                      </div>
                    </button>
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30 px-2 py-1 rounded">
                        Team
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LayoutManager;
