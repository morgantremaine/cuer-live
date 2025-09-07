
import { useState, useCallback, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useUserColumnPreferences';

export const useRundownUIState = (
  items: RundownItem[],
  visibleColumns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  setColumns: (columns: Column[]) => void,
  columns: Column[]
) => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleColorPicker = useCallback((itemId: string | null) => {
    setShowColorPicker(prev => prev === itemId ? null : itemId);
  }, []);

  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  }, [updateItem]);

  const getRowStatus = useCallback((item: RundownItem): 'upcoming' | 'current' | 'completed' | 'header' => {
    if (item.status) {
      // Ensure the status is one of the allowed values
      if (['upcoming', 'current', 'completed'].includes(item.status)) {
        return item.status as 'upcoming' | 'current' | 'completed';
      }
    }
    if (item.type === 'header') return 'header';
    return 'upcoming';
  }, []);

  const getColumnWidth = useCallback((column: Column) => {
    return column.width || '150px';
  }, []);

  const updateColumnWidth = useCallback((columnId: string, width: number) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, width: `${width}px` } : col
    );
    setColumns(newColumns);
  }, [columns, setColumns]);

  // Enhanced navigation function
  const navigateToCell = useCallback((targetItemId: string, targetField: string) => {
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      const targetCellKey = `${targetItemId}-${targetField}`;
      
      // Try multiple selection strategies
      let targetElement: HTMLElement | null = null;
      
      // Strategy 1: Look for textarea/input with data attributes
      targetElement = document.querySelector(`[data-cell-id="${targetCellKey}"]`) as HTMLElement;
      
      // Strategy 2: Look for elements that match the ref pattern
      if (!targetElement) {
        const inputs = document.querySelectorAll('input, textarea');
        for (const input of inputs) {
          const element = input as HTMLInputElement | HTMLTextAreaElement;
          if (element.getAttribute('data-cell-ref') === targetCellKey) {
            targetElement = element;
            break;
          }
        }
      }
      
      // Strategy 3: Use cellRefs as fallback
      if (!targetElement) {
        targetElement = cellRefs.current[targetCellKey];
      }
      
      if (targetElement && typeof targetElement.focus === 'function') {
        setEditingCell(targetCellKey);
        targetElement.focus();
        if (targetElement instanceof HTMLInputElement || targetElement instanceof HTMLTextAreaElement) {
          targetElement.select();
        }
      }
    }, 50);
  }, []);

  const handleCellClick = useCallback((
    itemId: string,
    field: string,
    event: React.MouseEvent
  ) => {
    const cellKey = `${itemId}-${field}`;
    setEditingCell(cellKey);
    
    const cellElement = cellRefs.current[cellKey];
    
    if (cellElement) {
      // Small delay to ensure the element is focused
      setTimeout(() => {
        cellElement.focus();
        if (cellElement instanceof HTMLInputElement || cellElement instanceof HTMLTextAreaElement) {
          cellElement.select();
        }
      }, 10);
    }
  }, []);

  const handleKeyDown = useCallback((
    event: React.KeyboardEvent,
    itemId: string,
    field: string,
    itemIndex: number
  ) => {
    const { key, shiftKey } = event;
    
    // Handle navigation keys
    if (key === 'Enter' || key === 'ArrowDown') {
      event.preventDefault();
      
      // Find the next non-header item
      let nextItemIndex = itemIndex + 1;
      while (nextItemIndex < items.length && isHeaderItem(items[nextItemIndex])) {
        nextItemIndex++;
      }
      
      if (nextItemIndex < items.length) {
        const nextItemId = items[nextItemIndex].id;
        navigateToCell(nextItemId, field);
      }
    } else if (key === 'ArrowUp') {
      event.preventDefault();
      
      // Find the previous non-header item
      let prevItemIndex = itemIndex - 1;
      while (prevItemIndex >= 0 && isHeaderItem(items[prevItemIndex])) {
        prevItemIndex--;
      }
      
      if (prevItemIndex >= 0) {
        const prevItem = items[prevItemIndex];
        navigateToCell(prevItem.id, field);
      }
    } else if (key === 'Tab') {
      event.preventDefault();
      
      // Find next/previous cell
      let nextItemIndex = itemIndex;
      let nextFieldIndex = visibleColumns.findIndex(col => col.key === field);
      
      if (shiftKey) {
        // Previous cell
        nextFieldIndex--;
        if (nextFieldIndex < 0) {
          nextFieldIndex = visibleColumns.length - 1;
          nextItemIndex--;
        }
      } else {
        // Next cell
        nextFieldIndex++;
        if (nextFieldIndex >= visibleColumns.length) {
          nextFieldIndex = 0;
          nextItemIndex++;
        }
      }
      
      // Ensure we stay within bounds and skip headers for tab navigation
      if (nextItemIndex >= 0 && nextItemIndex < items.length && nextFieldIndex >= 0) {
        let targetItem = items[nextItemIndex];
        
        // Skip headers when tabbing
        if (isHeaderItem(targetItem)) {
          if (shiftKey && nextItemIndex > 0) {
            targetItem = items[nextItemIndex - 1];
          } else if (!shiftKey && nextItemIndex < items.length - 1) {
            targetItem = items[nextItemIndex + 1];
          } else {
            return; // Can't navigate further
          }
        }
        
        const nextField = visibleColumns[nextFieldIndex];
        
        if (targetItem && nextField) {
          navigateToCell(targetItem.id, nextField.key);
        }
      }
    }
  }, [items, visibleColumns, navigateToCell]);

  return {
    showColorPicker,
    cellRefs,
    editingCell,
    setEditingCell,
    handleToggleColorPicker,
    selectColor,
    getRowStatus,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown,
    navigateToCell
  };
};
