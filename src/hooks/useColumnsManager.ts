
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

  // Use refs to prevent recreating callbacks
  const markAsChangedRef = useRef(markAsChanged);
  markAsChangedRef.current = markAsChanged;

  // Stable visible columns computation
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.isVisible !== false);
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
      const newColumns = [...prev];
      newColumns.splice(1, 0, newColumn); // Insert after segment name
      return newColumns;
    });
    
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleReorderColumns = useCallback((newColumns: Column[]) => {
    setColumns(newColumns);
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleDeleteColumn = useCallback((columnId: string) => {
    setColumns(prev => prev.filter(col => col.id !== columnId));
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleRenameColumn = useCallback((columnId: string, newName: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, name: newName } : col
    ));
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleToggleColumnVisibility = useCallback((columnId: string) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId 
        ? { ...col, isVisible: col.isVisible !== false ? false : true }
        : col
    ));
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleUpdateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumns(prev => prev.map(col => 
      col.id === columnId ? { ...col, width: `${width}px` } : col
    ));
    if (markAsChangedRef.current) {
      markAsChangedRef.current();
    }
  }, []);

  const handleLoadLayout = useCallback((layoutColumns: Column[]) => {
    if (!Array.isArray(layoutColumns)) {
      return;
    }

    setColumns(prevColumns => {
      // Essential built-in columns that must always exist
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

      // Filter out invalid columns
      const filteredLayoutColumns = layoutColumns.filter(col => 
        col.id && col.name && col.id !== 'element' && col.key !== 'element'
      );

      // Build merged columns array
      const mergedColumns: Column[] = [];
      const layoutColumnIds = new Set(filteredLayoutColumns.map(col => col.id));

      // Add layout columns first
      filteredLayoutColumns.forEach(layoutCol => {
        mergedColumns.push({
          ...layoutCol,
          name: layoutCol.name === 'Start Time' ? 'Start' : 
                layoutCol.name === 'End Time' ? 'End' :
                layoutCol.name === 'Elapsed Time' ? 'Elapsed' : layoutCol.name
        });
      });

      // Add missing essential columns
      essentialBuiltInColumns.forEach(essentialCol => {
        if (!layoutColumnIds.has(essentialCol.id)) {
          mergedColumns.push(essentialCol);
        }
      });

      // Only update if actually different to prevent loops
      const isSame = prevColumns.length === mergedColumns.length && 
        prevColumns.every((col, index) => {
          const mergedCol = mergedColumns[index];
          return mergedCol && 
            col.id === mergedCol.id && 
            col.name === mergedCol.name &&
            col.isVisible === mergedCol.isVisible &&
            col.width === mergedCol.width;
        });
      
      if (isSame) {
        return prevColumns;
      }
      
      return mergedColumns;
    });
  }, []);

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
