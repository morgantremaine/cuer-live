import { useState, useCallback } from 'react';
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
  const [isResizing, setIsResizing] = useState(false);

  // Update column width with minimum width enforcement
  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    const column = columns.find(col => col.id === columnId);
    const minimumWidth = column ? getMinimumWidth(column) : 50;
    const constrainedWidth = Math.max(minimumWidth, width);
    
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
  }, [onColumnWidthChange, onUpdateColumnWidth, columns, isResizing]);

  // Calculate if we need to expand columns to fill viewport
  const shouldExpandToViewport = useCallback(() => {
    let totalWidth = 64; // Row number column
    columns.forEach(column => {
      const width = column.width || '150px';
      const widthValue = parseInt(width.replace('px', ''));
      totalWidth += widthValue;
    });
    
    const viewportWidth = window.innerWidth;
    return totalWidth < viewportWidth;
  }, [columns]);

  // Get column width - with viewport expansion when needed
  const getColumnWidth = useCallback((column: Column) => {
    const naturalWidth = column.width || '150px';
    
    if (!shouldExpandToViewport()) {
      return naturalWidth;
    }

    // Calculate total natural width
    let totalNaturalWidth = 64; // Row number column
    const naturalWidths: { [key: string]: number } = {};
    
    columns.forEach(col => {
      const width = col.width || '150px';
      const widthValue = parseInt(width.replace('px', ''));
      naturalWidths[col.id] = widthValue;
      totalNaturalWidth += widthValue;
    });

    const viewportWidth = window.innerWidth;
    const extraSpace = viewportWidth - totalNaturalWidth;
    const totalColumnWidth = Object.values(naturalWidths).reduce((sum, width) => sum + width, 0);
    
    // Calculate proportional expansion
    const naturalWidthValue = naturalWidths[column.id];
    const proportion = naturalWidthValue / totalColumnWidth;
    const additionalWidth = Math.floor(extraSpace * proportion);
    const expandedWidth = naturalWidthValue + additionalWidth;
    
    return `${expandedWidth}px`;
  }, [columns, shouldExpandToViewport]);

  // Get column width for table layout - same as getColumnWidth for consistency
  const getColumnWidthForTable = useCallback((column: Column) => {
    return getColumnWidth(column);
  }, [getColumnWidth]);

  // Get total table width including row number column
  const getTotalTableWidth = useCallback(() => {
    let total = 64; // Row number column width
    columns.forEach(column => {
      const width = getColumnWidth(column);
      const widthValue = parseInt(width.replace('px', ''));
      total += widthValue;
    });
    
    // When expanding to viewport, ensure we fill exactly the viewport width
    if (shouldExpandToViewport()) {
      return window.innerWidth;
    }
    
    return total;
  }, [columns, getColumnWidth, shouldExpandToViewport]);

  return {
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthForTable,
    getTotalTableWidth
  };
};