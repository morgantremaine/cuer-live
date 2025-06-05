
import React, { useMemo, useCallback } from 'react';
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
}

const ColumnManager = React.memo(({ 
  columns, 
  onAddColumn, 
  onReorderColumns, 
  onDeleteColumn, 
  onToggleColumnVisibility,
  onLoadLayout,
  onRenameColumn,
  onClose 
}: ColumnManagerProps) => {
  
  const { savedLayouts, loading, saveLayout, updateLayout, renameLayout, deleteLayout } = useColumnLayoutStorage();

  // Create stable callback wrappers to prevent child re-renders
  const stableOnAddColumn = useCallback((name: string) => {
    console.log('ColumnManager: stableOnAddColumn called with:', name);
    onAddColumn(name);
  }, [onAddColumn]);

  const stableOnReorderColumns = useCallback((newColumns: Column[]) => {
    onReorderColumns(newColumns);
  }, [onReorderColumns]);

  const stableOnToggleColumnVisibility = useCallback((columnId: string) => {
    onToggleColumnVisibility(columnId);
  }, [onToggleColumnVisibility]);

  const stableOnDeleteColumn = useCallback((columnId: string) => {
    onDeleteColumn(columnId);
  }, [onDeleteColumn]);

  const stableOnRenameColumn = useCallback((columnId: string, newName: string) => {
    if (onRenameColumn) {
      onRenameColumn(columnId, newName);
    }
  }, [onRenameColumn]);

  const stableOnLoadLayout = useCallback((layoutColumns: Column[]) => {
    onLoadLayout(layoutColumns);
  }, [onLoadLayout]);

  // Memoize layout props to prevent LayoutManager re-renders
  const layoutProps = useMemo(() => ({
    columns,
    savedLayouts,
    loading,
    onSaveLayout: saveLayout,
    onUpdateLayout: updateLayout,
    onRenameLayout: renameLayout,
    onDeleteLayout: deleteLayout,
    onLoadLayout: stableOnLoadLayout
  }), [columns, savedLayouts, loading, saveLayout, updateLayout, renameLayout, deleteLayout, stableOnLoadLayout]);

  // Memoize column list props to prevent ColumnList re-renders
  const columnListProps = useMemo(() => ({
    columns,
    onReorderColumns: stableOnReorderColumns,
    onToggleColumnVisibility: stableOnToggleColumnVisibility,
    onDeleteColumn: stableOnDeleteColumn,
    onRenameColumn: stableOnRenameColumn
  }), [columns, stableOnReorderColumns, stableOnToggleColumnVisibility, stableOnDeleteColumn, stableOnRenameColumn]);

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
          <LayoutManager {...layoutProps} />

          <ColumnEditor onAddColumn={stableOnAddColumn} />

          <ColumnList {...columnListProps} />
        </div>

        <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-600">
          <Button variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Custom comparison function to prevent unnecessary re-renders
  return (
    prevProps.columns === nextProps.columns &&
    prevProps.onAddColumn === nextProps.onAddColumn &&
    prevProps.onReorderColumns === nextProps.onReorderColumns &&
    prevProps.onDeleteColumn === nextProps.onDeleteColumn &&
    prevProps.onToggleColumnVisibility === nextProps.onToggleColumnVisibility &&
    prevProps.onLoadLayout === nextProps.onLoadLayout &&
    prevProps.onRenameColumn === nextProps.onRenameColumn &&
    prevProps.onClose === nextProps.onClose
  );
});

ColumnManager.displayName = 'ColumnManager';

export default ColumnManager;
