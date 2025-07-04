
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
  numberingSystem?: 'sequential' | 'letter_number';
  onAddColumn: (name: string) => void;
  onReorderColumns: (columns: Column[]) => void;
  onDeleteColumn: (columnId: string) => void;
  onToggleColumnVisibility: (columnId: string) => void;
  onLoadLayout: (columns: Column[]) => void;
  onRenameColumn?: (columnId: string, newName: string) => void;
  onNumberingSystemChange?: (system: 'sequential' | 'letter_number') => void;
  onClose: () => void;
}

const ColumnManager = ({ 
  columns, 
  numberingSystem = 'sequential',
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onRenameColumn,
  onNumberingSystemChange,
  onClose 
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

          {/* Numbering System Toggle */}
          {onNumberingSystemChange && (
            <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                Row Numbering System
              </h3>
              <div className="space-y-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="numbering-system"
                    value="sequential"
                    checked={numberingSystem === 'sequential'}
                    onChange={() => onNumberingSystemChange('sequential')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Sequential Numbers (1, 2, 3...)
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="radio"
                    name="numbering-system"
                    value="letter_number"
                    checked={numberingSystem === 'letter_number'}
                    onChange={() => onNumberingSystemChange('letter_number')}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Letter + Number (A, A1, A2, B, B1...)
                  </span>
                </label>
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
