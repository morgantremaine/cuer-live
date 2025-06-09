
import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

export const useSimpleColumnWidths = (
  columns: Column[], 
  onColumnWidthChange?: (columnId: string, width: number) => void
) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Initialize from columns
  useEffect(() => {
    const widths: { [key: string]: number } = {};
    columns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widths[column.id] = widthValue;
        }
      }
    });
    setColumnWidths(widths);
  }, [columns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    setColumnWidths(prev => {
      const newWidths = { ...prev, [columnId]: width };
      
      // Call the callback for each update to trigger save mechanism
      if (onColumnWidthChange) {
        // Use setTimeout to ensure this doesn't block the UI during drag
        setTimeout(() => {
          onColumnWidthChange(columnId, width);
        }, 0);
      }
      
      return newWidths;
    });
  }, [onColumnWidthChange]);

  const getColumnWidth = useCallback((column: Column) => {
    if (columnWidths[column.id]) {
      return `${columnWidths[column.id]}px`;
    }
    
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      return column.width;
    }
    
    // Default widths
    if (column.key === 'duration' || column.key === 'startTime' || column.key === 'endTime') {
      return '100px';
    }
    if (column.key === 'segmentName') {
      return '150px';
    }
    if (column.key === 'notes') {
      return '200px';
    }
    return '120px';
  }, [columnWidths]);

  return {
    updateColumnWidth,
    getColumnWidth
  };
};
