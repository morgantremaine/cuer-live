
import { useState, useRef, useCallback } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  // Add debug logging to track cellRefs state
  const debugCellRefs = useCallback(() => {
    console.log('Current cellRefs keys:', Object.keys(cellRefs.current));
  }, []);

  const handleCellClick = useCallback((itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string, field: string) => {
    console.log('Navigation key pressed:', e.key, 'from', itemId, field);
    debugCellRefs();
    
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
        const cellKey = `${nextItemId}-${field}`;
        console.log('Trying to focus next cell:', cellKey);
        setSelectedCell({ itemId: nextItemId, field });
        
        setTimeout(() => {
          const targetCell = cellRefs.current[cellKey];
          if (targetCell) {
            targetCell.focus();
            console.log('Focused cell:', cellKey);
          } else {
            console.log('Cell not found in refs:', cellKey);
            debugCellRefs();
          }
        }, 0);
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
        const cellKey = `${prevItem.id}-${field}`;
        console.log('Trying to focus previous cell:', cellKey);
        setSelectedCell({ itemId: prevItem.id, field });
        
        setTimeout(() => {
          const targetCell = cellRefs.current[cellKey];
          if (targetCell) {
            targetCell.focus();
            console.log('Focused cell:', cellKey);
          } else {
            console.log('Cell not found in refs:', cellKey);
            debugCellRefs();
          }
        }, 0);
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
        const cellKey = `${nextItem.id}-${field}`;
        console.log('Trying to focus next cell:', cellKey);
        setSelectedCell({ itemId: nextItem.id, field });
        
        setTimeout(() => {
          const targetCell = cellRefs.current[cellKey];
          if (targetCell) {
            targetCell.focus();
            console.log('Focused cell:', cellKey);
          } else {
            console.log('Cell not found in refs:', cellKey);
            debugCellRefs();
          }
        }, 0);
      }
    }
  }, [items, debugCellRefs]);

  return {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  };
};
