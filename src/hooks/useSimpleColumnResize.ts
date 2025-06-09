
import { useState, useCallback, useRef, useEffect } from 'react';
import { Column } from './useColumnsManager';

export const useSimpleColumnResize = (
  columns: Column[], 
  onColumnWidthChange?: (columnId: string, width: number) => void
) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();
  const isUpdatingRef = useRef(false);

  // Initialize column widths from columns data
  useEffect(() => {
    const initialWidths: { [key: string]: number } = {};
    columns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          initialWidths[column.id] = widthValue;
        }
      }
    });
    
    setColumnWidths(prev => {
      const hasChanges = Object.keys(initialWidths).some(key => 
        prev[key] !== initialWidths[key]
      );
      return hasChanges ? { ...prev, ...initialWidths } : prev;
    });
  }, [columns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    if (isUpdatingRef.current) return;
    
    isUpdatingRef.current = true;
    
    setColumnWidths(prev => {
      if (prev[columnId] === width) {
        isUpdatingRef.current = false;
        return prev;
      }
      
      const newWidths = { ...prev, [columnId]: width };
      
      // Clear existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Debounced auto-save
      saveTimeoutRef.current = setTimeout(() => {
        if (onColumnWidthChange) {
          onColumnWidthChange(columnId, width);
        }
        isUpdatingRef.current = false;
      }, 500);
      
      return newWidths;
    });
  }, [onColumnWidthChange]);

  const getColumnWidth = useCallback((column: Column) => {
    // Check state first for any custom widths
    if (columnWidths[column.id]) {
      return `${columnWidths[column.id]}px`;
    }
    
    // Parse existing width if it's in pixels
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      return column.width;
    }
    
    // Default widths based on column type
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      isUpdatingRef.current = false;
    };
  }, []);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth
  };
};
