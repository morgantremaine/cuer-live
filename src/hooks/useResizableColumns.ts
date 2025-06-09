
import { useState, useCallback, useEffect, useRef } from 'react';
import { Column } from './useColumnsManager';

export const useResizableColumns = (initialColumns: Column[], onColumnWidthChange?: (columnId: string, width: number) => void) => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastCallbackRef = useRef(onColumnWidthChange);

  // Keep callback ref updated
  lastCallbackRef.current = onColumnWidthChange;

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
    setColumnWidths(prev => {
      // Only update if actually different to prevent unnecessary re-renders
      const hasChanges = Object.keys(widthsFromColumns).some(key => 
        prev[key] !== widthsFromColumns[key]
      ) || Object.keys(prev).length !== Object.keys(widthsFromColumns).length;
      
      return hasChanges ? widthsFromColumns : prev;
    });
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
      }, 300); // Increased debounce to 300ms to ensure resize is complete
      
      return newWidths;
    });
  }, []);

  const getColumnWidth = useCallback((column: Column) => {
    // First check our local columnWidths state
    if (columnWidths[column.id]) {
      const width = `${columnWidths[column.id]}px`;
      console.log('📏 getColumnWidth from state:', column.id, width);
      return width;
    }
    
    // Parse existing width if it's in pixels
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      console.log('📏 getColumnWidth from column:', column.id, column.width);
      return column.width;
    }
    
    // Reduced default widths based on column type
    let defaultWidth = '120px';
    if (column.key === 'duration' || column.key === 'startTime' || column.key === 'endTime') {
      defaultWidth = '100px';
    } else if (column.key === 'segmentName') {
      defaultWidth = '150px';
    } else if (column.key === 'notes') {
      defaultWidth = '200px';
    }
    
    console.log('📏 getColumnWidth using default:', column.id, defaultWidth);
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
