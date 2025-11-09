import { useMemo, useCallback } from 'react';
import { Column } from '@/types/columns';
import { getMinimumWidth } from '@/utils/columnSizing';

interface UseMemoizedColumnCalculationsProps {
  columns: Column[];
  columnWidths: { [columnId: string]: number };
}

/**
 * Phase 3: Memoized column calculations for optimal performance
 * Prevents unnecessary recalculations during resize operations
 */
export const useMemoizedColumnCalculations = ({
  columns,
  columnWidths
}: UseMemoizedColumnCalculationsProps) => {
  
  // Memoized total table width calculation
  const totalTableWidth = useMemo(() => {
    return columns.reduce((total, column) => {
      const width = columnWidths[column.id] || getMinimumWidth(column);
      return total + width;
    }, 50); // Add 50px for row number column
  }, [columns, columnWidths]);

  // Memoized column width getter with minimum width enforcement
  const getColumnWidth = useCallback((column: Column): string => {
    const width = columnWidths[column.id];
    const minWidth = getMinimumWidth(column);
    const finalWidth = width ? Math.max(width, minWidth) : minWidth;
    return `${finalWidth}px`;
  }, [columnWidths]);

  // Memoized column min-widths map
  const columnMinWidths = useMemo(() => {
    const map = new Map<string, number>();
    columns.forEach(col => {
      map.set(col.id, getMinimumWidth(col));
    });
    return map;
  }, [columns]);

  // Fast column width lookup (optimized for large column counts)
  const getColumnWidthFast = useCallback((columnId: string): number => {
    return columnWidths[columnId] || columnMinWidths.get(columnId) || 120;
  }, [columnWidths, columnMinWidths]);

  return {
    totalTableWidth,
    getColumnWidth,
    getColumnWidthFast,
    columnMinWidths
  };
};
