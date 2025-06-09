import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Column } from './useColumnsManager';

export const useResizableColumns = (initialColumns: Column[], onColumnWidthChange?: (columnId: string, width: number) => void) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallbackRef = useRef(onColumnWidthChange);
  const isInitializedRef = useRef(false);

  // Keep callback ref updated
  lastCallbackRef.current = onColumnWidthChange;

  // Initialize column widths from the columns data
  useEffect(() => {
    if (isInitializedRef.current) return; // Only initialize once
    
    const widthsFromColumns: { [key: string]: number } = {};
    initialColumns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const widthValue = parseInt(column.width.replace('px', ''));
        if (!isNaN(widthValue)) {
          widthsFromColumns[column.id] = widthValue;
        }
      }
    });
    
    if (Object.keys(widthsFromColumns).length > 0) {
      setColumnWidths(widthsFromColumns);
      isInitializedRef.current = true;
    }
  }, [initialColumns]);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    console.log('📏 updateColumnWidth called:', { columnId, width });
    
    setColumnWidths(prev => {
      // Only update if width actually changed
      if (prev[columnId] === width) {
        console.log('📏 Width unchanged, skipping update');
        return prev;
      }
      
      const newWidths = { ...prev, [columnId]: width };
      console.log('📏 Setting new width immediately:', newWidths);
      
      // Debounce the callback to prevent excessive auto-save triggers
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      
      debounceTimeoutRef.current = setTimeout(() => {
        if (lastCallbackRef.current) {
          console.log('🔍 Calling debounced onColumnWidthChange callback');
          lastCallbackRef.current(columnId, width);
        }
      }, 500); // Increased debounce to 500ms to ensure resize is complete
      
      return newWidths;
    });
  }, []);

  // Memoize the getColumnWidth function to prevent recreation on every render
  const getColumnWidth = useCallback((column: Column) => {
    // First check our local columnWidths state
    if (columnWidths[column.id]) {
      const width = `${columnWidths[column.id]}px`;
      return width;
    }
    
    // Parse existing width if it's in pixels
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      return column.width;
    }
    
    // Default widths based on column type
    let defaultWidth = '120px';
    if (column.key === 'duration' || column.key === 'startTime' || column.key === 'endTime') {
      defaultWidth = '100px';
    } else if (column.key === 'segmentName') {
      defaultWidth = '150px';
    } else if (column.key === 'notes') {
      defaultWidth = '200px';
    }
    
    return defaultWidth;
  }, [columnWidths]);

  const getColumnWidthsForSaving = useCallback(() => {
    return columnWidths;
  }, [columnWidths]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  return {
    columnWidths,
    updateColumnWidth,
    getColumnWidth,
    getColumnWidthsForSaving
  };
};
