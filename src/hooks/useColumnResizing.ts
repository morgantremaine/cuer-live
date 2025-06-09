
import { useState, useCallback, useRef } from 'react';
import { Column } from './useColumnsManager';

interface ColumnWidths {
  [columnId: string]: number;
}

export const useColumnResizing = (
  columns: Column[],
  onColumnWidthUpdate: (columnId: string, width: number) => void
) => {
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>({});
  const saveTimeoutRef = useRef<NodeJS.Timeout>();

  // Get the effective width for a column
  const getColumnWidth = useCallback((column: Column): number => {
    // First check our local state
    if (columnWidths[column.id]) {
      return columnWidths[column.id];
    }
    
    // Then check the column's stored width
    if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
      const numericWidth = parseInt(column.width.replace('px', ''));
      if (!isNaN(numericWidth)) {
        return numericWidth;
      }
    }
    
    // Default widths based on column type
    const defaultWidths: Record<string, number> = {
      'segmentName': 200,
      'talent': 150,
      'script': 300,
      'gfx': 150,
      'video': 150,
      'duration': 120,
      'startTime': 120,
      'endTime': 120,
      'elapsedTime': 120,
      'notes': 300
    };
    
    return defaultWidths[column.key] || 150;
  }, [columnWidths]);

  // Update column width with debounced auto-save
  const updateColumnWidth = useCallback((columnId: string, newWidth: number) => {
    console.log('🔄 Updating column width:', columnId, newWidth);
    
    // Update local state immediately for UI responsiveness
    setColumnWidths(prev => ({
      ...prev,
      [columnId]: newWidth
    }));

    // Clear any existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set up debounced save
    saveTimeoutRef.current = setTimeout(() => {
      console.log('💾 Auto-saving column width change');
      onColumnWidthUpdate(columnId, newWidth);
    }, 500);
  }, [onColumnWidthUpdate]);

  // Initialize widths from columns when they change
  const initializeWidths = useCallback(() => {
    const newWidths: ColumnWidths = {};
    columns.forEach(column => {
      if (column.width && typeof column.width === 'string' && column.width.endsWith('px')) {
        const numericWidth = parseInt(column.width.replace('px', ''));
        if (!isNaN(numericWidth)) {
          newWidths[column.id] = numericWidth;
        }
      }
    });
    setColumnWidths(newWidths);
  }, [columns]);

  return {
    getColumnWidth,
    updateColumnWidth,
    initializeWidths
  };
};
