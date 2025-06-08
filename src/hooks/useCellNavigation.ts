import { useState, useRef } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const handleCellClick = (itemId: string, field: string) => {
    console.log('Cell clicked:', itemId, field);
    setSelectedCell({ itemId, field });
  };

  // Helper function to find the best matching field for navigation between different row types
  const findNavigationField = (targetItemId: string, currentField: string): string => {
    const targetItem = items.find(item => item.id === targetItemId);
    if (!targetItem) return currentField;

    // If navigating from header to regular row, or vice versa, we need to map fields appropriately
    if (isHeaderItem(targetItem)) {
      // Navigating to a header - use segmentName if coming from any field
      if (currentField === 'segmentName' || currentField === 'script' || currentField === 'notes') {
        return 'segmentName';
      }
    } else {
      // Navigating to a regular row
      if (currentField === 'segmentName') {
        // Coming from header segmentName, go to script field on regular row
        return 'script';
      }
      // For other fields, keep the same field if it exists
      const targetRef = cellRefs.current[`${targetItemId}-${currentField}`];
      if (targetRef) {
        return currentField;
      }
      // Fallback to script if the current field doesn't exist on target
      return 'script';
    }
    
    return currentField;
  };

  const navigateToCell = (itemId: string, field: string) => {
    console.log('Navigating to cell:', itemId, field);
    setSelectedCell({ itemId, field });
    setTimeout(() => {
      const cellRef = cellRefs.current[`${itemId}-${field}`];
      console.log('Cell ref found:', !!cellRef, `${itemId}-${field}`);
      if (cellRef) {
        cellRef.focus();
        // For textareas, place cursor at the end
        if (cellRef instanceof HTMLTextAreaElement) {
          const length = cellRef.value.length;
          cellRef.setSelectionRange(length, length);
        }
      } else {
        console.log('Cell ref not found, available refs:', Object.keys(cellRefs.current).filter(key => key.startsWith(itemId)));
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    console.log('Key pressed:', e.key, 'in cell:', itemId, field);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key - navigating down');
      
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentIndex + 1;
      while (nextItemIndex < items.length && isHeaderItem(items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < items.length) {
        const nextItemId = items[nextItemIndex].id;
        const targetField = findNavigationField(nextItemId, field);
        navigateToCell(nextItemId, targetField);
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Arrow up - navigating up');
      
      const currentItemIndex = items.findIndex(item => item.id === itemId);
      
      // Find the previous non-header item
      let prevItemIndex = currentItemIndex - 1;
      while (prevItemIndex >= 0 && isHeaderItem(items[prevItemIndex])) {
        prevItemIndex--;
      }
      
      if (prevItemIndex >= 0) {
        const prevItem = items[prevItemIndex];
        const targetField = findNavigationField(prevItem.id, field);
        navigateToCell(prevItem.id, targetField);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Arrow down - navigating down');
      
      const currentItemIndex = items.findIndex(item => item.id === itemId);
      
      // Find the next non-header item
      let nextItemIndex = currentItemIndex + 1;
      while (nextItemIndex < items.length && isHeaderItem(items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < items.length) {
        const nextItem = items[nextItemIndex];
        const targetField = findNavigationField(nextItem.id, field);
        navigateToCell(nextItem.id, targetField);
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
