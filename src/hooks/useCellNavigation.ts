
import { useState, useRef } from 'react';
import { Column } from './useColumnsManager';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useCellNavigation = (columns: Column[], items: RundownItem[]) => {
  const [selectedCell, setSelectedCell] = useState<{ itemId: string; field: string } | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const handleCellClick = (itemId: string, field: string) => {
    setSelectedCell({ itemId, field });
  };

  const handleKeyDown = (e: React.KeyboardEvent, itemId: string, field: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = items.findIndex(item => item.id === itemId);
      const editableColumns = columns.filter(col => col.isEditable);
      const currentFieldIndex = editableColumns.findIndex(col => col.key === field || `custom_${col.key}` === field);
      
      if (currentFieldIndex < editableColumns.length - 1) {
        const nextField = editableColumns[currentFieldIndex + 1];
        const nextFieldKey = nextField.isCustom ? `custom_${nextField.key}` : nextField.key;
        setSelectedCell({ itemId, field: nextFieldKey });
        setTimeout(() => {
          cellRefs.current[`${itemId}-${nextFieldKey}`]?.focus();
        }, 0);
      } else if (currentIndex < items.length - 1) {
        const nextItemId = items[currentIndex + 1].id;
        const firstField = editableColumns[0];
        const firstFieldKey = firstField.isCustom ? `custom_${firstField.key}` : firstField.key;
        setSelectedCell({ itemId: nextItemId, field: firstFieldKey });
        setTimeout(() => {
          cellRefs.current[`${nextItemId}-${firstFieldKey}`]?.focus();
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
        setSelectedCell({ itemId: prevItem.id, field });
        setTimeout(() => {
          cellRefs.current[`${prevItem.id}-${field}`]?.focus();
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
        setSelectedCell({ itemId: nextItem.id, field });
        setTimeout(() => {
          cellRefs.current[`${nextItem.id}-${field}`]?.focus();
        }, 0);
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
