
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

const getDefaultColumns = (): Column[] => [
  { id: 'name', name: 'Segment Name', key: 'name', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'images', name: 'Images', key: 'images', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
];

export const useColumnsManager = (markAsChanged?: () => void) => {
  const [columns, setColumns] = useState<Column[]>(getDefaultColumns());

  // Ensure columns is always an array before filtering and ensure all default columns are visible
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
      
      return newColumns;
    });
    
    // Mark as changed when adding a column
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    if (!Array.isArray(newColumns)) return;
    
    setColumns(newColumns);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const filtered = prev.filter(col => col.id !== columnId);
      
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
      
      return;
    }

    

    setColumns(prevColumns => {
      // Ensure prevColumns is an array
      if (!Array.isArray(prevColumns)) {
        
        return layoutColumns; // Return the layout columns as fallback
      }

      // Get the default columns to ensure all built-ins are included
      const defaultColumns = getDefaultColumns();

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

      // Then, add any missing default columns (including gfx and video)
      const addedColumns: string[] = [];
      defaultColumns.forEach(defaultCol => {
        if (!layoutColumnIds.has(defaultCol.id)) {
          mergedColumns.push(defaultCol);
          addedColumns.push(defaultCol.id);
        }
      });

      
      if (markAsChanged) {
        markAsChanged();
      }
      return mergedColumns;
    });
  }, [markAsChanged]);

  // Reset to default columns function for new rundowns
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultColumns();
    setColumns(defaults);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  // Debug function to check current columns state
  const debugColumns = useCallback(() => {
    // Debug info available in development tools
  }, [columns, visibleColumns]);

  return {
    columns: Array.isArray(columns) ? columns : [],
    visibleColumns,
    handleAddColumn,
    handleReorderColumns,
    handleDeleteColumn,
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth,
    resetToDefaults,
    debugColumns
  };
};
