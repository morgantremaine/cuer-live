import { useState, useEffect, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

const STORAGE_KEY = 'shared-rundown-column-order';

interface UseLocalSharedColumnOrderReturn {
  orderedColumns: Column[];
  reorderColumns: (newColumns: Column[]) => void;
  resetColumnOrder: () => void;
}

export const useLocalSharedColumnOrder = (
  originalColumns: Column[]
): UseLocalSharedColumnOrderReturn => {
  const [orderedColumns, setOrderedColumns] = useState<Column[]>(originalColumns);

  // Load saved order from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const savedOrder: string[] = JSON.parse(saved);
        
        // Reorder columns based on saved order, keeping any new columns at the end
        const reordered = [...originalColumns].sort((a, b) => {
          const aIndex = savedOrder.indexOf(a.key);
          const bIndex = savedOrder.indexOf(b.key);
          
          // If both columns are in saved order, use that order
          if (aIndex !== -1 && bIndex !== -1) {
            return aIndex - bIndex;
          }
          
          // If only one column is in saved order, prioritize it
          if (aIndex !== -1) return -1;
          if (bIndex !== -1) return 1;
          
          // If neither is in saved order, maintain original order
          const originalAIndex = originalColumns.indexOf(a);
          const originalBIndex = originalColumns.indexOf(b);
          return originalAIndex - originalBIndex;
        });
        
        setOrderedColumns(reordered);
      } else {
        setOrderedColumns(originalColumns);
      }
    } catch (error) {
      console.error('Failed to load column order from localStorage:', error);
      setOrderedColumns(originalColumns);
    }
  }, [originalColumns]);

  // Save column order to localStorage
  const saveColumnOrder = useCallback((columns: Column[]) => {
    try {
      const columnOrder = columns.map(col => col.key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnOrder));
    } catch (error) {
      console.error('Failed to save column order to localStorage:', error);
    }
  }, []);

  // Reorder columns with new column array (consistent with main rundown system)
  const reorderColumns = useCallback((newColumns: Column[]) => {
    setOrderedColumns(newColumns);
    // Save the new order
    saveColumnOrder(newColumns);
  }, [saveColumnOrder]);

  // Reset to original column order
  const resetColumnOrder = useCallback(() => {
    setOrderedColumns(originalColumns);
    localStorage.removeItem(STORAGE_KEY);
  }, [originalColumns]);

  return {
    orderedColumns,
    reorderColumns,
    resetColumnOrder
  };
};
