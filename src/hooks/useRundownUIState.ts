
import { useState, useCallback, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownUIState = (
  items: RundownItem[],
  visibleColumns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  setColumns: (columns: Column[]) => void,
  columns: Column[],
  saveUndoState?: (items: RundownItem[], columns: Column[], title: string, action: string) => void,
  title?: string
) => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleToggleColorPicker = useCallback((itemId: string | null) => {
    setShowColorPicker(prev => prev === itemId ? null : itemId);
  }, []);

  const selectColor = useCallback((id: string, color: string) => {
    if (saveUndoState && title !== undefined) {
      saveUndoState(items, columns, title, 'Change row color');
    }
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  }, [updateItem, saveUndoState, items, columns, title]);

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
    console.log('🔑 navigateToCell called:', { targetItemId, targetField });
    // Clear any existing timeout
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }

    navigationTimeoutRef.current = setTimeout(() => {
      const targetCellKey = `${targetItemId}-${targetField}`;
      console.log('🔑 looking for cell:', targetCellKey);
      
      // Try multiple selection strategies - ensure we get input/textarea elements only
      let targetElement: HTMLInputElement | HTMLTextAreaElement | null = null;
      
      // Strategy 1: Look for textarea/input with data attributes
      const element1 = document.querySelector(`[data-cell-id="${targetCellKey}"]`);
      if (element1 && (element1.tagName === 'TEXTAREA' || element1.tagName === 'INPUT')) {
        targetElement = element1 as HTMLInputElement | HTMLTextAreaElement;
      }
      console.log('🔑 Strategy 1 result:', targetElement);
      
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
        console.log('🔑 Strategy 2 result:', targetElement);
      }
      
      // Strategy 3: Use cellRefs as fallback (accept any element type, we'll handle it)
      if (!targetElement) {
        const refElement = cellRefs.current[targetCellKey];
        if (refElement) {
          targetElement = refElement as any; // Accept div or input/textarea
        }
        console.log('🔑 Strategy 3 result:', targetElement);
      }
      
      if (targetElement && typeof targetElement.focus === 'function') {
        console.log('🔑 focusing element:', targetElement.tagName, targetElement);
        setEditingCell(targetCellKey);
        
        // If it's a div (display mode), click it to enter editing mode
        if (targetElement.tagName === 'DIV') {
          targetElement.click();
          // Wait for the editing mode to activate, then focus the textarea
          setTimeout(() => {
            const textareaElement = document.querySelector(`[data-cell-id="${targetCellKey}"]`) as HTMLTextAreaElement;
            if (textareaElement && textareaElement.tagName === 'TEXTAREA') {
              textareaElement.focus();
              textareaElement.select();
            }
          }, 50);
        } else {
          // It's already an input/textarea, focus directly
          targetElement.focus();
          targetElement.select();
        }
      } else {
        console.log('🔑 target element not found or not focusable:', { targetCellKey, targetElement });
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
    console.log('🔑 handleKeyDown called:', { key: event.key, itemId, field, itemIndex });
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
        console.log('🔑 navigating to next cell:', { nextItemId, field, nextItemIndex });
        navigateToCell(nextItemId, field);
      } else {
        console.log('🔑 no next item found, at end of list');
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
        console.log('🔑 navigating to prev cell:', { prevItemId: prevItem.id, field, prevItemIndex });
        navigateToCell(prevItem.id, field);
      } else {
        console.log('🔑 no prev item found, at start of list');
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
