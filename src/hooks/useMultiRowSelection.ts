import { useState } from 'react';

export const useMultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleRowSelection = (itemId: string, index: number, isShiftClick = false, isCtrlClick = false, allItems: any[]) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftClick && lastSelectedIndex !== null) {
        // Clear current selection and select range
        newSelection.clear();
        const start = Math.min(lastSelectedIndex, index);
        const end = Math.max(lastSelectedIndex, index);
        
        for (let i = start; i <= end; i++) {
          if (allItems[i]) {
            newSelection.add(allItems[i].id);
          }
        }
      } else if (isCtrlClick) {
        // Toggle single selection while keeping others
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        setLastSelectedIndex(index);
      } else {
        // Single selection - clear others and select this one
        newSelection.clear();
        newSelection.add(itemId);
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
