import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Column } from './useColumnsManager';

export const useResizableColumns = (initialColumns: Column[], onColumnWidthChange?: (columnId: string, width: number) => void) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const updateTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallbackRef = useRef(onColumnWidthChange);
  const isUpdatingRef = useRef(false);
  const lastWidthsRef = useRef<string>('');

  // Keep callback ref updated
  lastCallbackRef.current = onColumnWidthChange;

  // Initialize column widths from the columns data - with aggressive memoization
  const initialWidths = useMemo(() => {
    const widthsFromColumns: { [key: string]: number } = {};
    initialColumns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widthsFromColumns[column.id] = widthValue;
        }
      }
    });
    
    // Only return new object if content actually changed
    const newWidthsString = JSON.stringify(widthsFromColumns);
    if (lastWidthsRef.current === newWidthsString) {
      return columnWidths; // Return existing object to prevent reference change
    }
    lastWidthsRef.current = newWidthsString;
    return widthsFromColumns;
  }, [initialColumns, columnWidths]);

  // Only update state if widths actually changed
  useEffect(() => {
    if (isUpdatingRef.current) return;
    
    setColumnWidths(prev => {
      const hasChanges = Object.keys(initialWidths).some(key => 
        prev[key] !== initialWidths[key]
      ) || Object.keys(prev).length !== Object.keys(initialWidths).length;
      
      return hasChanges ? initialWidths : prev;
    });
  }, [initialWidths]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    // Prevent recursive updates and rapid fire updates
    if (isUpdatingRef.current) {
      console.log('🔄 Skipping column width update - already updating');
      return;
    }
    
    setColumnWidths(prev => {
      // Only update if width actually changed
      if (prev[columnId] === width) {
        console.log('🔄 Skipping column width update - same width');
        return prev;
      }
      
      console.log('🔄 handleUpdateColumnWidth called:', { columnId, width });
      
      isUpdatingRef.current = true;
      const newWidths = { ...prev, [columnId]: width };
      
      // Clear any existing timeout
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      
      // Debounce the callback to prevent excessive auto-saves - longer timeout for stability
      updateTimeoutRef.current = setTimeout(() => {
        if (lastCallbackRef.current) {
          console.log('🚀 Calling markAsChanged for column width update');
          lastCallbackRef.current(columnId, width);
        }
        isUpdatingRef.current = false;
      }, 750); // Increased from 500ms for more stability
      
      return newWidths;
    });
  }, []);

  // Highly memoized getColumnWidth to prevent recalculations
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

  const getColumnWidthsForSaving = useCallback(() => {
    return columnWidths;
  }, [columnWidths]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
      isUpdatingRef.current = false;
    };
  }, []);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  };
};
