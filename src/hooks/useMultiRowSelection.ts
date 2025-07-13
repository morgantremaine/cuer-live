
import { useState } from 'react';

export const useMultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const selectHeaderGroup = (headerGroupItemIds: string[]) => {
    console.log('🎯 selectHeaderGroup called with:', headerGroupItemIds);
    setSelectedRows(new Set(headerGroupItemIds));
    setLastSelectedIndex(null);
  };

  const toggleRowSelection = (itemId: string, index: number, isShiftClick = false, isCtrlClick = false, allItems: any[], headerGroupItemIds?: string[]) => {
    console.log('🎯 toggleRowSelection called:', { itemId, index, isShiftClick, isCtrlClick, headerGroupItemIds });
    
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
        // Single selection logic - check if clicking on already selected row(s)
        if (newSelection.has(itemId) && newSelection.size === 1) {
          // If clicking on the only selected row, clear selection
          newSelection.clear();
          setLastSelectedIndex(null);
        } else {
          // Clear others and select this one (or header group if provided)
          newSelection.clear();
          if (headerGroupItemIds && headerGroupItemIds.length > 1) {
            // Select entire header group
            console.log('🎯 Selecting header group in toggleRowSelection:', headerGroupItemIds);
            headerGroupItemIds.forEach(id => newSelection.add(id));
          } else {
            newSelection.add(itemId);
          }
          setLastSelectedIndex(index);
        }
      }
      
      console.log('🎯 New selection:', Array.from(newSelection));
      return newSelection;
    });
  };

  const clearSelection = () => {
    console.log('🎯 Clearing selection');
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
    selectAll,
    selectHeaderGroup
  };
};
