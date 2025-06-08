
import { useState } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (
  columns: Column[], 
  items: RundownItem[], 
  cellRefs: React.MutableRefObject<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>
) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);

  const handleCellClick = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    // Only handle navigation keys, let everything else pass through normally
    if (e.key === 'Enter' || e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const target = e.target as HTMLInputElement | HTMLTextAreaElement;
      
      // For expandable script/notes cells, check if we should navigate or edit
      if (field === 'script' || field === 'notes') {
        // If it's an expanded textarea and cursor is not at beginning/end, allow normal editing
        if (target instanceof HTMLTextAreaElement) {
          const cursorPosition = target.selectionStart;
          const textLength = target.value.length;
          
          if (e.key === 'ArrowUp' && cursorPosition > 0) {
            // Allow normal up arrow within text
            return;
          }
          if (e.key === 'ArrowDown' && cursorPosition < textLength) {
            // Allow normal down arrow within text
            return;
          }
          if (e.key === 'Enter') {
            // Allow Enter to create new lines in expanded textareas
            return;
          }
        }
      }
      
      // Navigate between cells
      e.preventDefault();
      
      const currentIndex = items.findIndex(item => item.id === itemId);
      
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        // Navigate down
        const nextIndex = currentIndex + 1;
        if (nextIndex < items.length) {
          const nextItem = items[nextIndex];
          const targetField = getNavigationField(nextItem, field);
          navigateToCell(nextItem.id, targetField);
        }
      } else if (e.key === 'ArrowUp') {
        // Navigate up
        const prevIndex = currentIndex - 1;
        if (prevIndex >= 0) {
          const prevItem = items[prevIndex];
          const targetField = getNavigationField(prevItem, field);
          navigateToCell(prevItem.id, targetField);
        }
      }
    }
  };

  const getNavigationField = (targetItem: RundownItem, currentField: string): string => {
    if (isHeaderItem(targetItem)) {
      return 'segmentName';
    }
    
    // For regular items, try to maintain the same field, or fallback to script
    const targetRef = `${targetItem.id}-${currentField}`;
    if (cellRefs.current[targetRef]) {
      return currentField;
    }
    
    // Fallback to script field for regular items
    return 'script';
  };

  const navigateToCell = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
    
    // Simple timeout to allow React to render the cell before focusing
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
    }, 10);
  };

  return {
    selectedCell,
    handleCellClick,
    handleKeyDown
  };
};
