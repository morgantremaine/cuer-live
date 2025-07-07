
import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

// Define minimum widths for different column types - optimized for content
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 95;
    case 'segmentName':
      return 100;
    case 'talent':
      return 60;
    case 'script':
    case 'notes':
      return 120;
    case 'gfx':
    case 'video':
      return 80;
    default:
      return 50;
  }
};

export const useSimpleColumnWidths = (
  columns: Column[], 
  onColumnWidthChange?: (columnId: string, width: number) => void,
  onUpdateColumnWidth?: (columnId: string, width: number) => void
) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const [isResizing, setIsResizing] = useState(false);

  // Initialize column widths based on columns
  useEffect(() => {
    if (!columns || columns.length === 0) return;

    const widths: { [key: string]: number } = {};
    
    columns.forEach(column => {
      const minimumWidth = getMinimumWidth(column);
      
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widths[column.id] = Math.max(minimumWidth, widthValue);
        } else {
          widths[column.id] = minimumWidth;
        }
      } else {
        widths[column.id] = minimumWidth;
      }
    });
    
    setColumnWidths(widths);
  }, [columns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    // Find the column to get its minimum width
    const column = columns.find(col => col.id === columnId);
    const minimumWidth = column ? getMinimumWidth(column) : 50;
    
    setColumnWidths(prev => {
      // Enforce minimum width constraint
      const constrainedWidth = Math.max(minimumWidth, width);
      const newWidths = { ...prev, [columnId]: constrainedWidth };
      
      // Only log during the start and end of resize operations
      if (!isResizing) {
        setIsResizing(true);
        setTimeout(() => setIsResizing(false), 1000);
      }

      // Call the callback for each update to trigger save mechanism
      if (onColumnWidthChange) {
        setTimeout(() => {
          onColumnWidthChange(columnId, constrainedWidth);
        }, 0);
      }

      // Also update the actual column data structure for persistence
      if (onUpdateColumnWidth) {
        setTimeout(() => {
          onUpdateColumnWidth(columnId, constrainedWidth);
        }, 0);
      }
      
      return newWidths;
    });
  }, [onColumnWidthChange, onUpdateColumnWidth, columns, isResizing]);

  // Get column width in pixels - simple fixed width approach
  const getColumnWidth = useCallback((column: Column) => {
    const width = columnWidths[column.id];
    const actualWidth = width || getMinimumWidth(column);
    return `${actualWidth}px`;
  }, [columnWidths]);

  // Get column width for table layout - same as getColumnWidth for consistency
  const getColumnWidthForTable = useCallback((column: Column) => {
    return getColumnWidth(column);
  }, [getColumnWidth]);

  return {
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthForTable
  };
};
