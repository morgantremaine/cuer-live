
import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

export const useResizableColumns = (initialColumns: Column[], onColumnWidthChange?: (columnId: string, width: number) => void) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Initialize column widths from the columns data
  useEffect(() => {
    const widthsFromColumns: { [key: string]: number } = {};
    initialColumns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widthsFromColumns[column.id] = widthValue;
        }
      }
    });
    setColumnWidths(widthsFromColumns);
  }, [initialColumns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    console.log('Updating column width in useResizableColumns:', columnId, width);
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: width
    }));
    
    // Notify the parent component about the width change
    if (onColumnWidthChange) {
      console.log('Calling onColumnWidthChange callback');
      onColumnWidthChange(columnId, width);
    }
  }, [onColumnWidthChange]);

  const getColumnWidth = useCallback((column: Column) => {
    if (columnWidths[column.id]) {
      return `${columnWidths[column.id]}px`;
    }
    
    // Parse existing width if it's in pixels
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      return column.width;
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

  const getColumnWidthsForSaving = useCallback(() => {
    return columnWidths;
  }, [columnWidths]);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  };
};
