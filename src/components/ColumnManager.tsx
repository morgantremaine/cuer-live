
import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useColumnLayoutStorage } from '@/hooks/useColumnLayoutStorage';
import LayoutManager from './ColumnManager/LayoutManager';
import ColumnEditor from './ColumnManager/ColumnEditor';
import ColumnList from './ColumnManager/ColumnList';

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
  debugColumns?: () => void;
  resetToDefaults?: () => void;
}

const ColumnManager = ({ 
  columns, 
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onRenameColumn,
  onClose,
  debugColumns,
  resetToDefaults
}: ColumnManagerProps) => {
  const { 
    savedLayouts, 
    loading, 
    saveLayout, 
    updateLayout, 
    renameLayout, 
    deleteLayout,
    canEditLayout
  } = useColumnLayoutStorage();

  // Enhanced load layout handler with better validation
  const handleLoadLayout = (layoutColumns: Column[]) => {
    console.log('🔄 ColumnManager: Loading layout with columns:', layoutColumns);
    
    if (!Array.isArray(layoutColumns)) {
      console.error('❌ Invalid layout columns - not an array:', layoutColumns);
      return;
    }

    if (layoutColumns.length === 0) {
      console.warn('⚠️ Layout has no columns');
      return;
    }

    // Validate column structure
    const validColumns = layoutColumns.filter(col => 
      col && 
      typeof col === 'object' && 
      col.id && 
      col.name && 
      col.key
    );

    if (validColumns.length !== layoutColumns.length) {
      console.warn('⚠️ Some columns were invalid:', {
        total: layoutColumns.length,
        valid: validColumns.length,
        invalid: layoutColumns.filter(col => !col || !col.id || !col.name || !col.key)
      });
    }

    console.log('✅ Loading', validColumns.length, 'valid columns');
    onLoadLayout(validColumns);
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
        
        <div className="p-4 space-y-6">
          <LayoutManager
            columns={columns}
            savedLayouts={savedLayouts}
            loading={loading}
            onSaveLayout={saveLayout}
            onUpdateLayout={updateLayout}
            onRenameLayout={renameLayout}
            onDeleteLayout={deleteLayout}
            onLoadLayout={handleLoadLayout}
            canEditLayout={canEditLayout}
          />

          {debugColumns && resetToDefaults && (
            <div className="space-y-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border">
              <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Debug Tools</h4>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" onClick={debugColumns}>
                  Debug Columns
                </Button>
                <Button size="sm" variant="outline" onClick={resetToDefaults}>
                  Reset to Defaults
                </Button>
              </div>
            </div>
          )}

          <ColumnEditor onAddColumn={onAddColumn} />

          <ColumnList
            columns={columns}
            onReorderColumns={onReorderColumns}
            onToggleColumnVisibility={onToggleColumnVisibility}
            onDeleteColumn={onDeleteColumn}
            onRenameColumn={onRenameColumn}
          />
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
