
import { useState } from 'react';

export interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
}

export const useColumnsManager = (markAsChanged?: () => void) => {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: 'min-w-48', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true }
  ]);

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

  const handleReorderColumns = (newColumns: Column[]) => {
    setColumns(newColumns);
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

  const handleToggleColumnVisibility = (columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, isVisible: col.isVisible !== false ? false : true } : col
    ));
    if (markAsChanged) {
      markAsChanged();
    }
  };

  const handleLoadLayout = (layoutColumns: Column[]) => {
    setColumns(layoutColumns);
    if (markAsChanged) {
      markAsChanged();
    }
  };

  return {
    columns,
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleToggleColumnVisibility,
    handleLoadLayout
  };
};
