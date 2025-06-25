
import { useRef, useCallback, useMemo } from 'react';

// Optimized cell reference management with pooling
export const useOptimizedCellRefs = () => {
  const cellRefsPool = useRef<Map<string, HTMLInputElement | HTMLTextAreaElement>>(new Map());
  const activeCells = useRef<Set<string>>(new Set());

  // Get or create cell ref with pooling
  const getCellRef = useCallback((cellKey: string) => {
    return (element: HTMLInputElement | HTMLTextAreaElement | null) => {
      if (element) {
        cellRefsPool.current.set(cellKey, element);
        activeCells.current.add(cellKey);
      } else {
        // Cleanup when element is unmounted
        cellRefsPool.current.delete(cellKey);
        activeCells.current.delete(cellKey);
      }
    };
  }, []);

  // Get cell element by key
  const getCell = useCallback((cellKey: string) => {
    return cellRefsPool.current.get(cellKey);
  }, []);

  // Focus cell by key
  const focusCell = useCallback((cellKey: string) => {
    const cell = cellRefsPool.current.get(cellKey);
    if (cell) {
      cell.focus();
    }
  }, []);

  // Cleanup inactive cells (memory optimization)
  const cleanupInactiveCells = useCallback(() => {
    const currentCells = new Set(cellRefsPool.current.keys());
    currentCells.forEach(cellKey => {
      if (!activeCells.current.has(cellKey)) {
        cellRefsPool.current.delete(cellKey);
      }
    });
  }, []);

  // Legacy compatibility object
  const legacyCellRefs = useMemo(() => ({
    current: Object.fromEntries(cellRefsPool.current.entries())
  }), []);

  return {
    getCellRef,
    getCell,
    focusCell,
    cleanupInactiveCells,
    cellRefs: legacyCellRefs // For backward compatibility
  };
};
