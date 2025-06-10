
import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

export const useSimpleColumnWidths = (
  columns: Column[], 
  onColumnWidthChange?: (columnId: string, width: number) => void,
  onUpdateColumnWidth?: (columnId: string, width: number) => void
) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Initialize from columns with better defaults
  useEffect(() => {
    const widths: { [key: string]: number } = {};
    columns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widths[column.id] = widthValue;
        }
      } else {
        // Set default widths if none specified
        widths[column.id] = getDefaultWidth(column);
      }
    });
    setColumnWidths(widths);
  }, [columns]);

  const getDefaultWidth = (column: Column): number => {
    switch (column.key) {
      case 'duration':
      case 'startTime':
      case 'endTime':
      case 'elapsedTime':
        return 100;
      case 'segmentName':
        return 200;
      case 'talent':
        return 120;
      case 'gfx':
      case 'video':
        return 150;
      case 'notes':
        return 250;
      default:
        return 120;
    }
  };

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

      // Also update the actual column data structure for persistence
      if (onUpdateColumnWidth) {
        setTimeout(() => {
          onUpdateColumnWidth(columnId, width);
        }, 0);
      }
      
      return newWidths;
    });
  }, [onColumnWidthChange, onUpdateColumnWidth]);

  const getColumnWidth = useCallback((column: Column) => {
    const width = columnWidths[column.id];
    if (width) {
      return `${width}px`;
    }
    
    // Fallback to default widths
    const defaultWidth = getDefaultWidth(column);
    return `${defaultWidth}px`;
  }, [columnWidths]);

  return {
    updateColumnWidth,
    getColumnWidth
  };
};
