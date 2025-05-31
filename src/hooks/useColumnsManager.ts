
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useRundownStorage } from './useRundownStorage';
import { useColumnLayoutStorage } from './useColumnLayoutStorage';

export interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
}

const defaultColumns: Column[] = [
  { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: 'min-w-48', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true }
];

export const useColumnsManager = (markAsChanged?: () => void) => {
  const [columns, setColumns] = useState<Column[]>(defaultColumns);
  const { id: rundownId } = useParams<{ id: string }>();
  const { savedRundowns, loading: rundownLoading } = useRundownStorage();
  const { savedLayouts, loading: layoutLoading } = useColumnLayoutStorage();

  // Load columns from rundown or default layout
  useEffect(() => {
    if (rundownLoading || layoutLoading) return;

    if (rundownId && savedRundowns.length > 0) {
      const existingRundown = savedRundowns.find(r => r.id === rundownId);
      if (existingRundown && existingRundown.column_layout) {
        console.log('Loading columns from saved rundown');
        setColumns(existingRundown.column_layout);
        return;
      }
    }

    // Check for default layout
    const defaultLayout = savedLayouts.find(layout => layout.is_default);
    if (defaultLayout) {
      console.log('Loading default column layout');
      setColumns(defaultLayout.columns);
    } else {
      console.log('Using built-in default columns');
      setColumns(defaultColumns);
    }
  }, [rundownId, savedRundowns, savedLayouts, rundownLoading, layoutLoading]);

  const visibleColumns = columns.filter(col => col.isVisible !== false);

  const handleAddColumn = (name: string = '') => {
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: 'min-w-32',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    
    // Insert the new column right after the segment name column (index 1)
    setColumns(prev => {
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn);
      return newColumns;
    });
    
    // Mark as changed when adding a column
    if (markAsChanged) {
      markAsChanged();
    }
  };

  const handleUpdateColumnName = (columnId: string, newName: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, name: newName } : col
    ));
    if (markAsChanged) {
      markAsChanged();
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    if (markAsChanged) {
      markAsChanged();
    }
  };

  return {
    columns,
    visibleColumns,
    handleAddColumn,
    handleUpdateColumnName,
    handleDeleteColumn
  };
};
