
import { useState, useCallback } from 'react';
import { Column } from './useColumnsManager';

export const useResizableColumns = (initialColumns: Column[]) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: width
    }));
  }, []);

  const getColumnWidth = useCallback((column: Column) => {
    if (columnWidths[column.id]) {
      return `${columnWidths[column.id]}px`;
    }
    
    // Default widths based on column type
    if (column.key === 'duration' || column.key === 'startTime' || column.key === 'endTime') {
      return '120px'; // Wide enough for 00:00:00
    }
    if (column.key === 'segmentName') {
      return '200px';
    }
    if (column.key === 'notes') {
      return '300px';
    }
    return '150px'; // Default for custom columns
  }, [columnWidths]);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  };
};
