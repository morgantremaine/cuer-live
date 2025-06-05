
import { useState, useCallback, useRef, useMemo } from 'react';

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
  const markAsChangedCallbackRef = useRef(markAsChanged);
  
  // Keep the callback ref up to date without causing re-renders
  markAsChangedCallbackRef.current = markAsChanged;

  // Memoize safe columns and visible columns to prevent unnecessary recalculations
  const safeColumns = useMemo(() => {
    return Array.isArray(columns) ? columns : DEFAULT_COLUMNS;
  }, [columns]);

  const visibleColumns = useMemo(() => {
    return safeColumns.filter(col => col.isVisible !== false);
  }, [safeColumns]);

  // Stable function to call markAsChanged without causing re-renders
  const triggerMarkAsChanged = useCallback(() => {
    if (markAsChangedCallbackRef.current && !isLoadingLayoutRef.current) {
      markAsChangedCallbackRef.current();
    }
  }, []);

  const handleAddColumn = useCallback((name: string) => {
    console.log('handleAddColumn called with:', name);
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
      console.log('Adding new column, new columns array:', newColumns);
      return newColumns;
    });
    
    triggerMarkAsChanged();
  }, [triggerMarkAsChanged]);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    if (Array.isArray(newColumns)) {
      setColumns(newColumns);
      triggerMarkAsChanged();
    }
  }, [triggerMarkAsChanged]);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      const safePrev = Array.isArray(prev) ? prev : DEFAULT_COLUMNS;
      const filtered = safePrev.filter(col => col.id !== columnId);
      return filtered;
    });
    triggerMarkAsChanged();
  }, [triggerMarkAsChanged]);

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
    triggerMarkAsChanged();
  }, [triggerMarkAsChanged]);

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
    triggerMarkAsChanged();
  }, [triggerMarkAsChanged]);

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
    triggerMarkAsChanged();
  }, [triggerMarkAsChanged]);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    // Prevent multiple simultaneous layout loads
    if (isLoadingLayoutRef.current) {
      console.log('Layout load already in progress, skipping');
      return;
    }
    
    console.log('Starting layout load with columns:', layoutColumns);
    isLoadingLayoutRef.current = true;

    // Validate input - must be an array of columns
    if (!Array.isArray(layoutColumns)) {
      console.warn('Invalid layout columns data - not an array:', layoutColumns);
      isLoadingLayoutRef.current = false;
      return;
    }

    // Validate that each item looks like a column
    const isValidColumnArray = layoutColumns.every(col => 
      col && 
      typeof col === 'object' && 
      typeof col.id === 'string' && 
      typeof col.name === 'string'
    );

    if (!isValidColumnArray) {
      console.warn('Invalid layout columns data - invalid column structure:', layoutColumns);
      isLoadingLayoutRef.current = false;
      return;
    }

    try {
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

      console.log('Setting new columns from layout:', mergedColumns);
      setColumns(mergedColumns);
      
      // DON'T trigger markAsChanged for layout loads to prevent auto-save loop
      
    } catch (error) {
      console.error('Error loading layout:', error);
    } finally {
      // Reset the loading flag after a delay
      setTimeout(() => {
        isLoadingLayoutRef.current = false;
      }, 100);
    }
  }, []); // No dependencies to keep this function completely stable

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
