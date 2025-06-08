
import { useState, useRef } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const handleCellClick = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  };

  const navigateToCell = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
    setTimeout(() => {
      const cellRef = cellRefs.current[`${itemId}-${field}`];
      if (cellRef) {
        cellRef.focus();
        // For textareas, place cursor at the end
        if (cellRef instanceof HTMLTextAreaElement) {
          const length = cellRef.value.length;
          cellRef.setSelectionRange(length, length);
        }
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
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
  };

  return {
    selectedCell,
    cellRefs,
    handleCellClick,
    handleKeyDown
  };
};
