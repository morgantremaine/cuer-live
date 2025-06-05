
import { useState, useCallback, useRef } from 'react';

export interface Column {
  id: string;
  name: string;
  key: string;
  width: string;
  isCustom: boolean;
  isEditable: boolean;
  isVisible?: boolean;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'segmentName', name: 'Segment Name', key: 'segmentName', width: '200px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'talent', name: 'Talent', key: 'talent', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'script', name: 'Script', key: 'script', width: '300px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'gfx', name: 'GFX', key: 'gfx', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'video', name: 'Video', key: 'video', width: '150px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'duration', name: 'Duration', key: 'duration', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
  { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
  { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
];

export const useColumnsManager = (markAsChanged?: () => void) => {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const isLoadingLayoutRef = useRef(false);

  // Ensure columns is always an array and calculate visibleColumns safely
  const safeColumns = Array.isArray(columns) ? columns : DEFAULT_COLUMNS;
  const visibleColumns = safeColumns.filter(col => col.isVisible !== false);

  const handleAddColumn = useCallback((name: string) => {
    const newColumn: Column = {
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      key: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      width: '150px',
      isCustom: true,
      isEditable: true,
      isVisible: true
    };
    
    setColumns(prev => {
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const newColumns = [...safePrev];
      newColumns.splice(1, 0, newColumn);
      return newColumns;
    });
    
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    if (Array.isArray(newColumns)) {
      setColumns(newColumns);
      if (markAsChanged) {
        markAsChanged();
      }
    }
  }, [markAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const filtered = safePrev.filter(col => col.id !== columnId);
      return filtered;
    });
    if (markAsChanged) {
      markAsChanged();
    }
  }, [markAsChanged]);

  const handleRenameColumn = useCallback((columnId: string, newName: string) => {
    setColumns(prev => {
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const updated = safePrev.map(col => {
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
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const updated = safePrev.map(col => {
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
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const updated = safePrev.map(col => {
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
    // Prevent multiple simultaneous layout loads
    if (isLoadingLayoutRef.current) {
      return;
    }
    isLoadingLayoutRef.current = true;

    setColumns(prevColumns => {
      try {
        // Ensure we have valid input
        if (!Array.isArray(layoutColumns)) {
          console.warn('Invalid layout columns data, keeping current columns');
          return prevColumns;
        }

        const safePrevColumns = Array.isArray(prevColumns) ? prevColumns : DEFAULT_COLUMNS;

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

        // Merge updated layout columns with essential built-in columns
        const mergedColumns: Column[] = [];
        const layoutColumnIds = new Set(updatedLayoutColumns.map(col => col.id));

        // First, add all columns from updated layout (preserving order, custom columns, and widths)
        updatedLayoutColumns.forEach(layoutCol => {
          mergedColumns.push(layoutCol);
        });

        // Then, add any missing essential built-in columns
        DEFAULT_COLUMNS.forEach(essentialCol => {
          if (!layoutColumnIds.has(essentialCol.id)) {
            mergedColumns.push(essentialCol);
          }
        });

        // Check if columns are actually different before updating
        const isSame = safePrevColumns.length === mergedColumns.length && 
          safePrevColumns.every((col, index) => {
            const merged = mergedColumns[index];
            return merged && 
              col.id === merged.id && 
              col.name === merged.name &&
              col.isVisible === merged.isVisible &&
              col.width === merged.width;
          });
        
        if (isSame) {
          return safePrevColumns; // Don't update if columns are the same
        }
        
        // Only mark as changed if this is not an initial load
        if (markAsChanged && safePrevColumns !== DEFAULT_COLUMNS) {
          markAsChanged();
        }
        return mergedColumns;
      } finally {
        // Reset the loading flag after a short delay to prevent rapid successive calls
        setTimeout(() => {
          isLoadingLayoutRef.current = false;
        }, 100);
      }
    });
  }, [markAsChanged]);

  return {
    columns: safeColumns,
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
