
import { useState, useRef } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const handleCellClick = (itemId: string, field: string) => {
    console.log('Cell clicked:', itemId, field);
    console.log('Available cell refs for this item:', Object.keys(cellRefs.current).filter(key => key.startsWith(itemId)));
    setSelectedCell({ itemId, field });
  };

  // Helper function to find the best matching field for navigation between different row types
  const findNavigationField = (targetItemId: string, currentField: string): string => {
    const targetItem = items.find(item => item.id === targetItemId);
    if (!targetItem) return currentField;

    console.log('Finding navigation field for:', targetItemId, 'current field:', currentField, 'target is header:', isHeaderItem(targetItem));

    if (isHeaderItem(targetItem)) {
      // Navigating to a header - headers only have segmentName
      return 'segmentName';
    } else {
      // Navigating to a regular row
      if (currentField === 'segmentName') {
        // Coming from header segmentName, go to script field on regular row
        return 'script';
      }
      
      // Check if the current field exists for the target item
      const targetRef = `${targetItemId}-${currentField}`;
      console.log('Checking if target ref exists:', targetRef, 'exists:', !!cellRefs.current[targetRef]);
      
      if (cellRefs.current[targetRef]) {
        return currentField;
      }
      
      // Fallback: try script, then notes, then the first available field
      if (cellRefs.current[`${targetItemId}-script`]) {
        console.log('Fallback to script field');
        return 'script';
      }
      if (cellRefs.current[`${targetItemId}-notes`]) {
        console.log('Fallback to notes field');
        return 'notes';
      }
      
      // Find the first available field for this item
      const availableFields = Object.keys(cellRefs.current)
        .filter(key => key.startsWith(targetItemId + '-'))
        .map(key => key.split('-')[1]);
      
      if (availableFields.length > 0) {
        console.log('Fallback to first available field:', availableFields[0]);
        return availableFields[0];
      }
      
      console.log('No available field found, keeping current field');
      return currentField;
    }
  };

  const navigateToCell = (itemId: string, field: string) => {
    console.log('Navigating to cell:', itemId, field);
    console.log('All available refs:', Object.keys(cellRefs.current));
    setSelectedCell({ itemId, field });
    
    // Use a polling approach to wait for the cell ref to be available
    const maxAttempts = 20; // Maximum attempts (20 * 10ms = 200ms max wait)
    let attempts = 0;
    
    const tryFocus = () => {
      attempts++;
      const cellRef = cellRefs.current[`${itemId}-${field}`];
      
      console.log(`Attempt ${attempts}: Cell ref found:`, !!cellRef, `${itemId}-${field}`);
      
      if (cellRef) {
        cellRef.focus();
        // For textareas, place cursor at the end
        if (cellRef instanceof HTMLTextAreaElement) {
          const length = cellRef.value.length;
          cellRef.setSelectionRange(length, length);
        }
        console.log('Successfully focused cell:', `${itemId}-${field}`);
        return;
      }
      
      // If we haven't found the ref yet and haven't exceeded max attempts, try again
      if (attempts < maxAttempts) {
        setTimeout(tryFocus, 10); // Wait 10ms before trying again
      } else {
        console.log('Cell ref not found after max attempts, available refs for item:', Object.keys(cellRefs.current).filter(key => key.startsWith(itemId)));
        
        // Final fallback: try to find any available ref for this item
        const availableRefs = Object.keys(cellRefs.current).filter(key => key.startsWith(itemId));
        if (availableRefs.length > 0) {
          console.log('Using fallback ref:', availableRefs[0]);
          const fallbackRef = cellRefs.current[availableRefs[0]];
          if (fallbackRef) {
            fallbackRef.focus();
          }
        }
      }
    };
    
    // Start the polling process
    tryFocus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    console.log('Key pressed:', e.key, 'in cell:', itemId, field);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      console.log('Enter key - navigating down');
      
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      // Find the next item (skip headers when looking for regular items)
      let nextItemIndex = currentIndex + 1;
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
      
      // Find the previous item
      let prevItemIndex = currentItemIndex - 1;
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
      
      // Find the next item
      let nextItemIndex = currentItemIndex + 1;
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
