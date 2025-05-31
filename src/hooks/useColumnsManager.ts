
import { useState, useCallback } from 'react';

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
    { id: 'talent', name: 'Talent', key: 'talent', width: 'min-w-32', isCustom: false, isEditable: true, isVisible: true },
    { id: 'script', name: 'Script', key: 'script', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true }
  ]);

  const visibleColumns = columns.filter(col => col.isVisible !== false);

  const handleAddColumn = useCallback((name: string) => {
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
  }, [markAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    setColumns(newColumns);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, isVisible: col.isVisible !== false ? false : true } : col
    ));
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    setColumns(prevColumns => {
      // Define essential built-in columns that should always be preserved
      const essentialBuiltInColumns = [
        { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: 'min-w-48', isCustom: false, isEditable: true, isVisible: true },
        { id: 'talent', name: 'Talent', key: 'talent', width: 'min-w-32', isCustom: false, isEditable: true, isVisible: true },
        { id: 'script', name: 'Script', key: 'script', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true },
        { id: 'duration', name: 'Duration', key: 'duration', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
        { id: 'startTime', name: 'Start Time', key: 'startTime', width: 'w-24', isCustom: false, isEditable: true, isVisible: true },
        { id: 'endTime', name: 'End Time', key: 'endTime', width: 'w-24', isCustom: false, isEditable: false, isVisible: true },
        { id: 'notes', name: 'Notes', key: 'notes', width: 'min-w-64', isCustom: false, isEditable: true, isVisible: true }
      ];

      // Merge layout columns with essential built-in columns
      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(layoutColumns.map(col => col.id));

      // First, add all columns from layout (preserving order and custom columns)
      layoutColumns.forEach(layoutCol => {
        mergedColumns.push(layoutCol);
      });

      // Then, add any missing essential built-in columns
      essentialBuiltInColumns.forEach(essentialCol => {
        if (!layoutColumnIds.has(essentialCol.id)) {
          mergedColumns.push(essentialCol);
        }
      });

      // Only mark as changed if columns are actually different
      const isSame = prevColumns.length === mergedColumns.length && 
        prevColumns.every((col, index) => 
          col.id === mergedColumns[index]?.id && 
          col.name === mergedColumns[index]?.name &&
          col.isVisible === mergedColumns[index]?.isVisible
        );
      
      if (isSame) {
        return prevColumns; // Don't update if columns are the same
      }
      
      if (markAsChanged) {
        markAsChanged();
      }
      return mergedColumns;
    });
  }, [markAsChanged]);

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
