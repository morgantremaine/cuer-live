import { useState, useEffect, useCallback } from 'react';
import { Column } from '@/hooks/useColumnsManager';

const STORAGE_KEY = 'shared-rundown-column-order';

interface UseLocalSharedColumnOrderReturn {
  orderedColumns: Column[];
  reorderColumns: (startIndex: number, endIndex: number) => void;
  resetColumnOrder: () => void;
}

export const useLocalSharedColumnOrder = (
  originalColumns: Column[],
  resetKey?: any // When this changes, reset the local storage
): UseLocalSharedColumnOrderReturn => {
  const [orderedColumns, setOrderedColumns] = useState<Column[]>(originalColumns);
  const [lastResetKey, setLastResetKey] = useState(resetKey);

  // Reset when resetKey changes
  useEffect(() => {
    if (resetKey !== lastResetKey) {
      setLastResetKey(resetKey);
      localStorage.removeItem(STORAGE_KEY);
      setOrderedColumns(originalColumns);
      return;
    }
  }, [resetKey, lastResetKey, originalColumns]);

  // Load saved order from localStorage on mount
  useEffect(() => {
    // Skip if we just reset
    if (resetKey !== lastResetKey) return;
    
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
  }, [originalColumns, resetKey, lastResetKey]);

  // Save column order to localStorage
  const saveColumnOrder = useCallback((columns: Column[]) => {
    try {
      const columnOrder = columns.map(col => col.key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columnOrder));
    } catch (error) {
      console.error('Failed to save column order to localStorage:', error);
    }
  }, []);

  // Reorder columns by moving from startIndex to endIndex
  const reorderColumns = useCallback((startIndex: number, endIndex: number) => {
    console.log('🔄 useLocalSharedColumnOrder reorderColumns called:', { startIndex, endIndex });
    setOrderedColumns(prev => {
      console.log('Previous columns:', prev.map(c => c.name));
      const newColumns = [...prev];
      const [removed] = newColumns.splice(startIndex, 1);
      newColumns.splice(endIndex, 0, removed);
      console.log('New columns order:', newColumns.map(c => c.name));
      
      // Save the new order
      saveColumnOrder(newColumns);
      
      return newColumns;
    });
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
