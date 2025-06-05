import { useState } from 'react';

export const useMultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleRowSelection = (itemId: string, index: number, isShiftClick = false, isCtrlClick = false) => {
    setSelectedRows(prev => {
      const newSelection = new Set(prev);
      
      if (isShiftClick && lastSelectedIndex !== null) {
        // For shift-click, we need the items array, but we'll handle this in the coordination layer
        // For now, just toggle the single item
        if (newSelection.has(itemId)) {
          newSelection.delete(itemId);
        } else {
          newSelection.add(itemId);
        }
        setLastSelectedIndex(index);
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
        if (newSelection.has(itemId)) {
          // If clicking on a selected row, clear all selections
          newSelection.clear();
          setLastSelectedIndex(null);
        } else {
          // Clear others and select this one
          newSelection.clear();
          newSelection.add(itemId);
          setLastSelectedIndex(index);
        }
      }
      
      return newSelection;
    });
  };

  // Enhanced version that can handle shift-click with items array
  const toggleRowSelectionWithItems = (itemId: string, index: number, isShiftClick = false, isCtrlClick = false, allItems: any[]) => {
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
        if (newSelection.has(itemId)) {
          // If clicking on a selected row, clear all selections
          newSelection.clear();
          setLastSelectedIndex(null);
        } else {
          // Clear others and select this one
          newSelection.clear();
          newSelection.add(itemId);
          setLastSelectedIndex(index);
        }
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
    toggleRowSelectionWithItems,
    clearSelection,
    selectAll
  };
};
