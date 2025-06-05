
import { useState, useCallback, useMemo, useRef } from 'react';

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
    { id: 'startTime', name: 'Start', key: 'startTime', width: '120px', isCustom: false, isEditable: true, isVisible: true },
    { id: 'endTime', name: 'End', key: 'endTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'elapsedTime', name: 'Elapsed', key: 'elapsedTime', width: '120px', isCustom: false, isEditable: false, isVisible: true },
    { id: 'notes', name: 'Notes', key: 'notes', width: '300px', isCustom: false, isEditable: true, isVisible: true }
  ]);

  // Stable ref to prevent re-creating the markAsChanged callback
  const markAsChangedRef = useRef(markAsChanged);
  markAsChangedRef.current = markAsChanged;

  // Memoize visible columns to prevent unnecessary re-renders
  const visibleColumns = useMemo(() => {
    return Array.isArray(columns) ? columns.filter(col => col.isVisible !== false) : [];
  }, [columns]);

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
    
    setColumns(prev => {
      if (!Array.isArray(prev)) return [newColumn];
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn);
      return newColumns;
    });
    
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    if (!Array.isArray(newColumns)) return;
    setColumns(newColumns);
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => {
      if (!Array.isArray(prev)) return [];
      const filtered = prev.filter(col => col.id !== columnId);
      return filtered;
    });
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

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
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

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
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

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
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    if (!Array.isArray(layoutColumns)) {
      console.error('handleLoadLayout: layoutColumns is not an array', layoutColumns);
      return;
    }

    setColumns(prevColumns => {
      if (!Array.isArray(prevColumns)) {
        console.error('handleLoadLayout: prevColumns is not an array', prevColumns);
        return layoutColumns;
      }

      const essentialBuiltInColumns = [
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

      const filteredLayoutColumns = layoutColumns.filter(col => 
        col.id !== 'element' && col.key !== 'element'
      );

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

      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(updatedLayoutColumns.map(col => col.id));

      updatedLayoutColumns.forEach(layoutCol => {
        mergedColumns.push(layoutCol);
      });

      essentialBuiltInColumns.forEach(essentialCol => {
        if (!layoutColumnIds.has(essentialCol.id)) {
          mergedColumns.push(essentialCol);
        }
      });

      // Only update if columns are actually different to prevent infinite loops
      const isSame = prevColumns.length === mergedColumns.length && 
        prevColumns.every((col, index) => 
          col.id === mergedColumns[index]?.id && 
          col.name === mergedColumns[index]?.name &&
          col.isVisible === mergedColumns[index]?.isVisible &&
          col.width === mergedColumns[index]?.width
        );
      
      if (isSame) {
        return prevColumns;
      }
      
      if (markAsChangedRef.current) {
        markAsChangedRef.current();
      }
      return mergedColumns;
    });
  }, []);

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
