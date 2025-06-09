
import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (
  items: RundownItem[],
  visibleColumns: any[],
  updateItem: (id: string, field: string, value: string) => void,
  editingCell: string | null,
  setEditingCell: (cell: string | null) => void
) => {
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLElement }>({});

  const navigateToCell = useCallback((targetItemId: string, targetField: string) => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    // Use a more robust approach with querySelector
    navigationTimeoutRef.current = setTimeout(() => {
      const targetCellKey = `${targetItemId}-${targetField}`;
      
      // Try multiple selection strategies
      let targetElement: HTMLElement | null = null;
      
      // Strategy 1: Look for textarea/input with data attributes
      targetElement = document.querySelector(`[data-cell-id="${targetCellKey}"]`) as HTMLElement;
      
      // Strategy 2: Look for elements that match the ref pattern
      if (!targetElement) {
        const inputs = document.querySelectorAll('input, textarea');
        for (const input of inputs) {
          const element = input as HTMLInputElement | HTMLTextAreaElement;
          if (element.getAttribute('data-cell-ref') === targetCellKey) {
            targetElement = element;
            break;
          }
        }
      }
      
      // Strategy 3: Look by ID pattern (fallback)
      if (!targetElement) {
        targetElement = document.getElementById(targetCellKey);
      }
      
      if (targetElement && typeof targetElement.focus === 'function') {
        targetElement.focus();
      }
    }, 100);
  }, []);

  const handleCellNavigation = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    const key = e.key;
    
    if (key === 'Enter' || key === 'ArrowDown') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentIndex + 1;
      while (nextItemIndex < items.length && isHeaderItem(items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < items.length) {
        const nextItemId = items[nextItemIndex].id;
        navigateToCell(nextItemId, field);
      }
    } else if (key === 'ArrowUp') {
      e.preventDefault();
      const currentItemIndex = items.findIndex(item => item.id === itemId);
      
      // Find the previous non-header item
      let prevItemIndex = currentItemIndex - 1;
      while (prevItemIndex >= 0 && isHeaderItem(items[prevItemIndex])) {
        prevItemIndex--;
      }
      
      if (prevItemIndex >= 0) {
        const prevItem = items[prevItemIndex];
        navigateToCell(prevItem.id, field);
      }
    }
  }, [items, navigateToCell]);

  const handleCellClick = useCallback((itemId: string, field: string) => {
    const cellKey = `${itemId}-${field}`;
    setEditingCell(cellKey);
  }, [setEditingCell]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    handleCellNavigation(e, itemId, field);
  }, [handleCellNavigation]);

  return { 
    handleCellNavigation,
    cellRefs,
    handleCellClick,
    handleKeyDown
  };
};
