
import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Column } from '@/types/columns';
import { throttle } from '@/utils/performanceOptimizations';

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

  // Phase 3: Throttled callbacks for persistence (avoid excessive saves during resize)
  const throttledOnColumnWidthChange = useRef(
    onColumnWidthChange ? throttle(onColumnWidthChange, 300) : null
  );
  const throttledOnUpdateColumnWidth = useRef(
    onUpdateColumnWidth ? throttle(onUpdateColumnWidth, 300) : null
  );

  // Update throttled refs when callbacks change
  useEffect(() => {
    throttledOnColumnWidthChange.current = onColumnWidthChange ? throttle(onColumnWidthChange, 300) : null;
    throttledOnUpdateColumnWidth.current = onUpdateColumnWidth ? throttle(onUpdateColumnWidth, 300) : null;
  }, [onColumnWidthChange, onUpdateColumnWidth]);

  // Phase 3: Memoized minimum widths map for faster lookups
  const minimumWidthsMap = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach(col => {
      map.set(col.id, getMinimumWidth(col));
    });
    return map;
  }, [columns]);

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
    // Use memoized minimum width lookup
    const minimumWidth = minimumWidthsMap.get(columnId) || 50;
    
    setColumnWidths(prev => {
      // Enforce minimum width constraint
      const constrainedWidth = Math.max(minimumWidth, width);
      const newWidths = { ...prev, [columnId]: constrainedWidth };
      
      // Only log during the start and end of resize operations
      if (!isResizing) {
        setIsResizing(true);
        setTimeout(() => setIsResizing(false), 1000);
      }

      // Phase 3: Use throttled callbacks to reduce excessive persistence calls
      if (throttledOnColumnWidthChange.current) {
        throttledOnColumnWidthChange.current(columnId, constrainedWidth);
      }

      if (throttledOnUpdateColumnWidth.current) {
        throttledOnUpdateColumnWidth.current(columnId, constrainedWidth);
      }
      
      return newWidths;
    });
  }, [minimumWidthsMap, isResizing]);

  // Phase 3: Memoized getColumnWidth for better performance
  const getColumnWidth = useCallback((column: Column) => {
    const width = columnWidths[column.id];
    const actualWidth = width || minimumWidthsMap.get(column.id) || getMinimumWidth(column);
    return `${actualWidth}px`;
  }, [columnWidths, minimumWidthsMap]);

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
