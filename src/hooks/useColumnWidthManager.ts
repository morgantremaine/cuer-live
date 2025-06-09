
import { useState, useCallback, useRef } from 'react';
import { Column } from './useColumnsManager';

interface ColumnWidthState {
  [columnId: string]: number;
}

export const useColumnWidthManager = (
  columns: Column[],
  onWidthChange?: (columnId: string, width: number) => void
) => {
  const [widths, setWidths] = useState<ColumnWidthState>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Get effective width for a column
  const getWidth = useCallback((column: Column): string => {
    // Check our local state first
    if (widths[column.id]) {
      return `${widths[column.id]}px`;
    }
    
    // Use column's defined width
    if (column.width) {
      return column.width;
    }
    
    // Default widths
    const defaults: { [key: string]: string } = {
      'duration': '100px',
      'startTime': '100px',
      'endTime': '100px',
      'segmentName': '150px',
      'notes': '200px'
    };
    
    return defaults[column.key] || '120px';
  }, [widths]);

  // Update width with auto-save
  const setWidth = useCallback((columnId: string, width: number) => {
    setWidths(prev => ({ ...prev, [columnId]: width }));
    
    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    
    // Auto-save after 300ms
    saveTimeoutRef.current = setTimeout(() => {
      if (onWidthChange) {
        onWidthChange(columnId, width);
      }
    }, 300);
  }, [onWidthChange]);

  // Initialize widths from columns when they change
  const initializeFromColumns = useCallback(() => {
    const newWidths: ColumnWidthState = {};
    columns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const numWidth = parseInt(column.width.replace('px', ''));
        if (!isNaN(numWidth)) {
          newWidths[column.id] = numWidth;
        }
      }
    });
    setWidths(newWidths);
  }, [columns]);

  return {
    getWidth,
    setWidth,
    initializeFromColumns
  };
};
