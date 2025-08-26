import { useState, useEffect, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

const STORAGE_KEY = 'shared-rundown-column-widths';

interface UseLocalSharedColumnWidthsReturn {
  getColumnWidth: (column: Column) => string;
  updateColumnWidth: (columnId: string, width: number) => void;
  resetColumnWidths: () => void;
}

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

export const useLocalSharedColumnWidths = (
  columns: Column[]
): UseLocalSharedColumnWidthsReturn => {
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({});

  // Load saved widths from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedWidths: { [key: string]: number } = JSON.parse(saved);
        setColumnWidths(savedWidths);
      }
    } catch (error) {
      console.error('Failed to load column widths from localStorage:', error);
    }
  }, []);

  // Save column widths to localStorage
  const saveColumnWidths = useCallback((widths: { [key: string]: number }) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(widths));
    } catch (error) {
      console.error('Failed to save column widths to localStorage:', error);
    }
  }, []);

  // Update a specific column width
  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    // Find the column to get its minimum width
    const column = columns.find(col => col.id === columnId);
    const minimumWidth = column ? getMinimumWidth(column) : 50;
    
    setColumnWidths(prev => {
      // Enforce minimum width constraint
      const constrainedWidth = Math.max(minimumWidth, width);
      const newWidths = { ...prev, [columnId]: constrainedWidth };
      
      // Save the new widths
      saveColumnWidths(newWidths);
      
      return newWidths;
    });
  }, [columns, saveColumnWidths]);

  // Get column width in pixels - use saved width or fallback to minimum
  const getColumnWidth = useCallback((column: Column) => {
    const savedWidth = columnWidths[column.id];
    const actualWidth = savedWidth || getMinimumWidth(column);
    return `${actualWidth}px`;
  }, [columnWidths]);

  // Reset to default column widths
  const resetColumnWidths = useCallback(() => {
    setColumnWidths({});
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return {
    getColumnWidth,
    updateColumnWidth,
    resetColumnWidths
  };
};