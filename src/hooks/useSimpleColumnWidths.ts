import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

// Define minimum widths for different column types - optimized for content
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 70; // Reduced to 70px to match time format content (HH:MM:SS)
    case 'segmentName':
      return 100; // Reduced from 150px to 100px
    case 'talent':
      return 60; // Reduced from 100px to 60px
    case 'script':
    case 'notes':
      return 120; // Reduced from 200px to 120px for text fields
    case 'gfx':
    case 'video':
      return 80; // Reduced from 120px to 80px
    default:
      return 50; // Reduced from 100px to 50px for custom columns
  }
};

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
      const minimumWidth = getMinimumWidth(column);
      
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          // Ensure the width is not below minimum
          widths[column.id] = Math.max(minimumWidth, widthValue);
        }
      } else {
        // Set default widths if none specified
        widths[column.id] = minimumWidth;
      }
    });
    setColumnWidths(widths);
  }, [columns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    // Find the column to get its minimum width
    const column = columns.find(col => col.id === columnId);
    const minimumWidth = column ? getMinimumWidth(column) : 100;
    
    setColumnWidths(prev => {
      // Enforce minimum width constraint
      const constrainedWidth = Math.max(minimumWidth, width);
      const newWidths = { ...prev, [columnId]: constrainedWidth };
      
      // Call the callback for each update to trigger save mechanism
      if (onColumnWidthChange) {
        // Use setTimeout to ensure this doesn't block the UI during drag
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
  }, [onColumnWidthChange, onUpdateColumnWidth, columns]);

  const getColumnWidth = useCallback((column: Column) => {
    const width = columnWidths[column.id];
    if (width) {
      return `${width}px`;
    }
    
    // Fallback to minimum widths
    const minimumWidth = getMinimumWidth(column);
    return `${minimumWidth}px`;
  }, [columnWidths]);

  return {
    updateColumnWidth,
    getColumnWidth
  };
};
