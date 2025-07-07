
import { useState, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';

// Define minimum widths for different column types - optimized for content
const getMinimumWidth = (column: Column): number => {
  switch (column.key) {
    case 'duration':
    case 'startTime':
    case 'endTime':
    case 'elapsedTime':
      return 95; // Reduced from 110px to 95px due to tighter padding
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
  const [isResizing, setIsResizing] = useState(false);

  // Initialize from columns with better defaults and calculate percentages
  useEffect(() => {
    const widths: { [key: string]: number } = {};
    let totalMinWidth = 0;
    
    // First pass: calculate minimum widths
    columns.forEach(column => {
      const minimumWidth = getMinimumWidth(column);
      totalMinWidth += minimumWidth;
      
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widths[column.id] = Math.max(minimumWidth, widthValue);
        }
      } else {
        widths[column.id] = minimumWidth;
      }
    });
    
    // Calculate total current width
    const totalCurrentWidth = Object.values(widths).reduce((sum, width) => sum + width, 0);
    
    // If we have space to distribute (assuming viewport is wider than minimum)
    // We'll let the table layout handle the distribution while respecting minimums
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
      
      // Only log during the start and end of resize operations
      if (!isResizing) {
        setIsResizing(true);
        setTimeout(() => setIsResizing(false), 1000);
      }

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
  }, [onColumnWidthChange, onUpdateColumnWidth, columns, isResizing]);

  // Calculate percentage-based widths that fill the table
  const getColumnWidth = useCallback((column: Column) => {
    const width = columnWidths[column.id];
    const actualWidth = width || getMinimumWidth(column);
    
    // Calculate total width of all columns
    const totalWidth = columns.reduce((sum, col) => {
      const colWidth = columnWidths[col.id] || getMinimumWidth(col);
      return sum + colWidth;
    }, 0);
    
    // Calculate percentage of total width
    const percentage = (actualWidth / totalWidth) * 100;
    return `${percentage}%`;
  }, [columnWidths, columns]);

  // Get column width for table layout - percentage-based for filling space
  const getColumnWidthForTable = useCallback((column: Column) => {
    return getColumnWidth(column);
  }, [getColumnWidth]);

  return {
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthForTable
  };
};
