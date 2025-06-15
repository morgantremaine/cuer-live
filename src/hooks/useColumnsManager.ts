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
    { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
  ]);

  // Ensure columns is always an array before filtering
  const visibleColumns = Array.isArray(columns) ? columns.filter(col => col.isVisible !== false) : [];

  const handleAddColumn = useCallback((name: string) => {
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
      if (!Array.isArray(prev)) return [newColumn];
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn);
      console.log('🔄 Adding new column:', newColumn.name, 'New total:', newColumns.length);
      return newColumns;
    });
    
    // Mark as changed when adding a column
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    if (!Array.isArray(newColumns)) return;
    console.log('🔄 Reordering columns to:', newColumns.length, 'columns');
    setColumns(newColumns);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const filtered = prev.filter(col => col.id !== columnId);
      console.log('🗑️ Deleting column:', columnId, 'Remaining:', filtered.length);
      return filtered;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleRenameColumn = useCallback((columnId: string, newName: string) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const updated = prev.map(col => {
        if (col.id === columnId) {
          return { ...col, name: newName };
        }
        return col;
      });
      console.log('✏️ Renaming column:', columnId, 'to:', newName);
      return updated;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const updated = prev.map(col => {
        if (col.id === columnId) {
          const newVisibility = col.isVisible !== false ? false : true;
          return { ...col, isVisible: newVisibility };
        }
        return col;
      });
      console.log('👁️ Toggling visibility for column:', columnId);
      return updated;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleUpdateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const updated = prev.map(col => {
        if (col.id === columnId) {
          return { ...col, width: `${width}px` };
        }
        return col;
      });
      return updated;
    });
    
    // Immediately mark as changed for column width updates
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    // Validate that layoutColumns is an array
    if (!Array.isArray(layoutColumns)) {
      console.error('handleLoadLayout: layoutColumns is not an array', layoutColumns);
      return;
    }

    console.log('📥 Loading layout with', layoutColumns.length, 'columns');

    setColumns(prevColumns => {
      // Ensure prevColumns is an array
      if (!Array.isArray(prevColumns)) {
        console.error('handleLoadLayout: prevColumns is not an array', prevColumns);
        return layoutColumns; // Return the layout columns as fallback
      }

      // Define essential built-in columns that should always be preserved (removed talent)
      const essentialBuiltInColumns = [
        { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
        { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
        { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
      ];

      // Filter out the "Element" column from layout columns
      const filteredLayoutColumns = layoutColumns.filter(col => 
        col.id !== 'element' && col.key !== 'element'
      );

      // Update column names for backward compatibility with old saved layouts
      const updatedLayoutColumns = filteredLayoutColumns.map(col => {
        if (col.id === 'startTime' && col.name === 'Start Time') {
          return { ...col, name: 'Start' };
        }
        if (col.id === 'endTime' && col.name === 'End Time') {
          return { ...col, name: 'End' };
        }
        if (col.id === 'elapsedTime' && col.name === 'Elapsed Time') {
          return { ...col, name: 'Elapsed' };
        }
        return col;
      });

      // Use the layout columns directly, ensuring essential columns are included
      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(updatedLayoutColumns.map(col => col.id));

      // First, add all columns from updated layout (preserving order, custom columns, and widths)
      updatedLayoutColumns.forEach(layoutCol => {
        mergedColumns.push(layoutCol);
      });

      // Then, add any missing essential built-in columns
      essentialBuiltInColumns.forEach(essentialCol => {
        if (!layoutColumnIds.has(essentialCol.id)) {
          mergedColumns.push(essentialCol);
        }
      });

      console.log('✅ Layout loaded with', mergedColumns.length, 'columns');
      
      if (markAsChanged) {
        markAsChanged();
      }
      return mergedColumns;
    });
  }, [markAsChanged]);

  return {
    columns: Array.isArray(columns) ? columns : [],
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth
  };
};
