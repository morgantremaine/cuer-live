import { useState, useEffect, useCallback } from 'react';

const getStorageKey = (rundownId: string) => `rundown-expanded-cells-${rundownId}`;

interface UseLocalExpandedCellsReturn {
  expandedCells: Set<string>;
  updateExpandedCells: (newSet: Set<string>) => void;
}

export const useLocalExpandedCells = (rundownId: string): UseLocalExpandedCellsReturn => {
  const [expandedCells, setExpandedCells] = useState<Set<string>>(new Set());

  // Load from localStorage on mount
  useEffect(() => {
    if (!rundownId) return;
    
    try {
      const storageKey = getStorageKey(rundownId);
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const cellKeys: string[] = JSON.parse(saved);
        setExpandedCells(new Set(cellKeys));
      }
    } catch (error) {
      console.error('Failed to load expanded cells from localStorage:', error);
      setExpandedCells(new Set());
    }
  }, [rundownId]);

  // Save to localStorage whenever state changes
  const updateExpandedCells = useCallback((newSet: Set<string>) => {
    setExpandedCells(newSet);
    
    if (rundownId) {
      try {
        const storageKey = getStorageKey(rundownId);
        localStorage.setItem(storageKey, JSON.stringify(Array.from(newSet)));
      } catch (error) {
        console.error('Failed to save expanded cells to localStorage:', error);
      }
    }
  }, [rundownId]);

  return { expandedCells, updateExpandedCells };
};
