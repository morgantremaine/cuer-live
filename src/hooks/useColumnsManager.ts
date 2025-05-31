
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
    { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
  ]);

  const visibleColumns = columns.filter(col => col.isVisible !== false);

  const handleAddColumn = useCallback((name: string) => {
    console.log('Adding column:', name);
    const newColumn: Column = {
      id: `custom_${Date.now()}`,
      name,
      key: `custom_${Date.now()}`,
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    
    // Insert the new column right after the segment name column (index 1)
    setColumns(prev => {
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn);
      console.log('New columns after add:', newColumns.length);
      return newColumns;
    });
    
    // Mark as changed when adding a column
    if (markAsChanged) {
      console.log('Marking as changed after adding column');
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    console.log('Reordering columns:', newColumns.length);
    setColumns(newColumns);
    if (markAsChanged) {
      console.log('Marking as changed after reordering columns');
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    console.log('Deleting column:', columnId);
    setColumns(prev => {
      const filtered = prev.filter(col => col.id !== columnId);
      console.log('Columns after delete:', filtered.length);
      return filtered;
    });
    if (markAsChanged) {
      console.log('Marking as changed after deleting column');
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    console.log('Toggling column visibility:', columnId);
    setColumns(prev => {
      const updated = prev.map(col => {
        if (col.id === columnId) {
          const newVisibility = col.isVisible !== false ? false : true;
          console.log(`Column ${columnId} visibility changed to:`, newVisibility);
          return { ...col, isVisible: newVisibility };
        }
        return col;
      });
      return updated;
    });
    if (markAsChanged) {
      console.log('Marking as changed after toggling column visibility');
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleUpdateColumnWidth = useCallback((columnId: string, width: number) => {
    console.log('Updating column width:', columnId, width);
    setColumns(prev => {
      const updated = prev.map(col => {
        if (col.id === columnId) {
          return { ...col, width: `${width}px` };
        }
        return col;
      });
      return updated;
    });
    if (markAsChanged) {
      console.log('Marking as changed after updating column width');
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    console.log('Loading layout with columns:', layoutColumns.length);
    setColumns(prevColumns => {
      // Define essential built-in columns that should always be preserved
      const essentialBuiltInColumns = [
        { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'startTime', name: 'Start Time', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'endTime', name: 'End Time', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
        { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
      ];

      // Merge layout columns with essential built-in columns
      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(layoutColumns.map(col => col.id));

      // First, add all columns from layout (preserving order, custom columns, and widths)
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
          col.isVisible === mergedColumns[index]?.isVisible &&
          col.width === mergedColumns[index]?.width
        );
      
      if (isSame) {
        console.log('Layout is the same, not updating');
        return prevColumns; // Don't update if columns are the same
      }
      
      console.log('Layout loaded, new column count:', mergedColumns.length);
      if (markAsChanged) {
        console.log('Marking as changed after loading layout');
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
    handleLoadLayout,
    handleUpdateColumnWidth
  };
};
