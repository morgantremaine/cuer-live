
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
    { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'startTime', name: 'Start Time', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End Time', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
  ]);

  const visibleColumns = columns.filter(col => col.isVisible !== false);

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
    setColumns(prev => {
      const filtered = prev.filter(col => col.id !== columnId);
      return filtered;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleRenameColumn = useCallback((columnId: string, newName: string) => {
    setColumns(prev => {
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
      const updated = prev.map(col => {
        if (col.id === columnId) {
          return { ...col, width: `${width}px` };
        }
        return col;
      });
      return updated;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    setColumns(prevColumns => {
      // Define essential built-in columns that should always be preserved
      const essentialBuiltInColumns = [
        { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'startTime', name: 'Start Time', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
        { id: 'endTime', name: 'End Time', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
        { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
      ];

      // Filter out the "Element" column from layout columns
      const filteredLayoutColumns = layoutColumns.filter(col => 
        col.id !== 'element' && col.key !== 'element'
      );

      // Merge filtered layout columns with essential built-in columns
      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(filteredLayoutColumns.map(col => col.id));

      // First, add all columns from filtered layout (preserving order, custom columns, and widths)
      filteredLayoutColumns.forEach(layoutCol => {
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
    handleRenameColumn,
    handleToggleColumnVisibility,
    handleLoadLayout,
    handleUpdateColumnWidth
  };
};
