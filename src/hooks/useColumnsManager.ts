
import { useState, useCallback, useEffect } from 'react';
import { useTeamCustomColumns } from './useTeamCustomColumns';

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
  const { teamColumns } = useTeamCustomColumns();
  const [columns, setColumns] = useState<Column[]>(() => {
    // Initialize with default columns merged with team columns
    return getDefaultColumns();
  });

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

  const handleToggleColumnVisibility = useCallback((columnId: string, insertIndex?: number) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      
      const columnToToggle = prev.find(col => col.id === columnId);
      if (!columnToToggle) return prev;
      
      // If hiding a column (making it invisible)
      if (columnToToggle.isVisible !== false) {
        return prev.map(col => {
          if (col.id === columnId) {
            return { ...col, isVisible: false };
          }
          return col;
        });
      }
      
      // If showing a column (making it visible)
      const updatedColumns = prev.map(col => 
        col.id === columnId ? { ...col, isVisible: true } : col
      );
      
      // If insertIndex is provided, reorder the column to that position
      if (typeof insertIndex === 'number') {
        const columnIndex = updatedColumns.findIndex(col => col.id === columnId);
        if (columnIndex !== -1) {
          const [column] = updatedColumns.splice(columnIndex, 1);
          updatedColumns.splice(insertIndex, 0, column);
        }
      }
      
      return updatedColumns;
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

  // Merge team custom columns with current columns to ensure all team columns are always available
  const mergeWithTeamColumns = useCallback((columnsToMerge: Column[]) => {
    const existingColumnKeys = new Set(columnsToMerge.map(col => col.key));
    const mergedColumns = [...columnsToMerge];

    // Add team custom columns that aren't already in the current layout
    teamColumns.forEach(teamCol => {
      if (!existingColumnKeys.has(teamCol.column_key)) {
        // Add team columns as hidden by default if not in the layout
        mergedColumns.push({
          id: teamCol.column_key,
          name: teamCol.column_name,
          key: teamCol.column_key,
          width: '150px',
          isCustom: true,
          isEditable: true,
          isVisible: false, // Hidden by default for team columns not in current layout
          isTeamColumn: true,
          createdBy: teamCol.created_by
        } as Column & { isTeamColumn?: boolean; createdBy?: string });
      }
    });

    // Ensure existing team columns retain their team metadata
    const finalColumns = mergedColumns.map(col => {
      const teamColumn = teamColumns.find(tc => tc.column_key === col.key);
      if (teamColumn && col.isCustom) {
        return {
          ...col,
          isTeamColumn: true,
          createdBy: teamColumn.created_by
        };
      }
      return col;
    });

    return finalColumns;
  }, [teamColumns]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    // Validate that layoutColumns is an array
    if (!Array.isArray(layoutColumns)) {
      console.error('Invalid layout columns - not an array:', layoutColumns);
      return;
    }

    console.log('🔄 Loading exact layout columns:', layoutColumns.length);

    let wasLayoutActuallyChanged = false;

    setColumns(prevColumns => {
      // Filter out the deprecated "Element" column from layout columns
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

      // CRITICAL FIX: Load exactly what was saved without automatic merging
      // Only merge team columns that were actually part of the saved layout
      const finalColumns = updatedLayoutColumns.map(col => {
        // Preserve team column metadata if it exists
        const teamColumn = teamColumns.find(tc => tc.column_key === col.key);
        if (teamColumn && col.isCustom) {
          return {
            ...col,
            isTeamColumn: true,
            createdBy: teamColumn.created_by
          };
        }
        return col;
      });

      // Check if the layout actually changed
      const columnsChanged = prevColumns.length !== finalColumns.length ||
        prevColumns.some((col, index) => {
          const newCol = finalColumns[index];
          return !newCol || col.id !== newCol.id || col.isVisible !== newCol.isVisible || col.width !== newCol.width;
        });

      if (columnsChanged) {
        wasLayoutActuallyChanged = true;
        console.log('✅ Loaded exact layout with', finalColumns.length, 'columns');
        
        if (markAsChanged) {
          markAsChanged();
        }
      } else {
        console.log('ℹ️ Layout unchanged - skipping unnecessary update');
      }
      
      // IMPORTANT: Return the new columns synchronously for immediate state update
      return finalColumns;
    });
    
    // CRITICAL FIX: Only persist if layout actually changed
    if (wasLayoutActuallyChanged) {
      setTimeout(() => {
        console.log('💾 Persisting loaded layout as current column state');
        if (markAsChanged) {
          markAsChanged();
        }
      }, 100);
    }
  }, [markAsChanged, teamColumns]);

  // Reset to default columns function for new rundowns
  const resetToDefaults = useCallback(() => {
    const defaults = getDefaultColumns();
    setColumns(defaults);
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  // Update columns when team columns change to ensure all team columns are available
  useEffect(() => {
    if (teamColumns.length > 0) {
      setColumns(prevColumns => {
        const mergedColumns = mergeWithTeamColumns(prevColumns);
        return mergedColumns;
      });
    }
  }, [teamColumns, mergeWithTeamColumns]);

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
