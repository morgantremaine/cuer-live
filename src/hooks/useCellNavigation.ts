
import { useState, useRef, useCallback, useEffect } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  const [pendingNavigation, setPendingNavigation] = useState<{ itemId: string; field: string } | null>(null);

  // Add debug logging to track cellRefs state
  const debugCellRefs = useCallback(() => {
    console.log('Current cellRefs keys:', Object.keys(cellRefs.current));
  }, []);

  // Effect to handle pending navigation after refs are updated
  useEffect(() => {
    if (pendingNavigation) {
      const cellKey = `${pendingNavigation.itemId}-${pendingNavigation.field}`;
      const targetCell = cellRefs.current[cellKey];
      
      if (targetCell) {
        console.log('Successfully navigated to pending cell:', cellKey);
        targetCell.focus();
        setPendingNavigation(null);
      } else {
        // If cell is still not found, try again on next render
        console.log('Pending navigation cell still not found:', cellKey);
        setTimeout(() => {
          const retryCell = cellRefs.current[cellKey];
          if (retryCell) {
            console.log('Successfully navigated to cell on retry:', cellKey);
            retryCell.focus();
            setPendingNavigation(null);
          } else {
            console.log('Failed to find cell on retry:', cellKey);
            debugCellRefs();
            setPendingNavigation(null);
          }
        }, 100);
      }
    }
  }, [pendingNavigation, debugCellRefs]);

  const handleCellClick = useCallback((itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  }, []);

  const navigateToCell = useCallback((targetItemId: string, targetField: string) => {
    const cellKey = `${targetItemId}-${targetField}`;
    console.log('Attempting to navigate to:', cellKey);
    debugCellRefs();
    
    setSelectedCell({ itemId: targetItemId, field: targetField });
    
    // First try immediate navigation
    const targetCell = cellRefs.current[cellKey];
    if (targetCell) {
      console.log('Immediate navigation successful:', cellKey);
      targetCell.focus();
    } else {
      console.log('Cell not immediately available, setting pending navigation:', cellKey);
      setPendingNavigation({ itemId: targetItemId, field: targetField });
    }
  }, [debugCellRefs]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    console.log('Navigation key pressed:', e.key, 'from', itemId, field);
    
    if (e.key === 'Enter') {
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
    } else if (e.key === 'ArrowUp') {
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
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentItemIndex = items.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentItemIndex + 1;
      while (nextItemIndex < items.length && isHeaderItem(items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < items.length) {
        const nextItem = items[nextItemIndex];
        navigateToCell(nextItem.id, field);
      }
    }
  }, [items, navigateToCell]);

  return {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  };
};
