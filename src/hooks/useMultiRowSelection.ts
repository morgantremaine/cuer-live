
import { useState } from 'react';

export const useMultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleRowSelection = (itemId: string, index: number, isShiftClick = false, allItems: any[]) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftClick && lastSelectedIndex !== null) {
        // Select range between last selected and current
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          if (allItems[i]) {
            newSelection.add(allItems[i].id);
          }
        }
      } else {
        // Toggle single selection
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        setLastSelectedIndex(index);
      }
      
      return newSelection;
    });
  };

  const clearSelection = () => {
    setSelectedRows(new Set());
    setLastSelectedIndex(null);
  };

  const selectAll = (items: any[]) => {
    setSelectedRows(new Set(items.map(item => item.id)));
  };

  return {
    selectedRows,
    toggleRowSelection,
    clearSelection,
    selectAll
  };
};
