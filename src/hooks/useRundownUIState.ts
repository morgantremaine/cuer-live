import { useState, useCallback, useRef } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/types/columns';

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
    const targetKey = `${targetItemId}-${targetField}`;
    const targetElement = cellRefs.current[targetKey];
    
    if (targetElement) {
      // Clear any existing timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      
      // Scroll to the element
      targetElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center',
        inline: 'nearest'
      });
      
      // Focus with a slight delay to ensure scroll is complete
      navigationTimeoutRef.current = setTimeout(() => {
        targetElement.focus();
        // Select all text if it's an input
        if ('select' in targetElement && typeof targetElement.select === 'function') {
          targetElement.select();
        }
      }, 100);
    }
  }, []);

  const handleCellClick = useCallback((itemId: string, field: string, event?: React.MouseEvent) => {
    setEditingCell(`${itemId}-${field}`);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, itemId: string, field: string, itemIndex?: number) => {
    const currentIndex = items.findIndex(item => item.id === itemId);
    const currentColumnIndex = visibleColumns.findIndex(col => col.key === field);
    
    if (e.key === 'Enter') {
      e.preventDefault();
      
      // Move to next row, same column
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        const nextItem = items[nextIndex];
        navigateToCell(nextItem.id, field);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      
      if (e.shiftKey) {
        // Move to previous column or previous row's last column
        if (currentColumnIndex > 0) {
          const prevColumn = visibleColumns[currentColumnIndex - 1];
          navigateToCell(itemId, prevColumn.key);
        } else if (currentIndex > 0) {
          const prevItem = items[currentIndex - 1];
          const lastColumn = visibleColumns[visibleColumns.length - 1];
          navigateToCell(prevItem.id, lastColumn.key);
        }
      } else {
        // Move to next column or next row's first column
        if (currentColumnIndex < visibleColumns.length - 1) {
          const nextColumn = visibleColumns[currentColumnIndex + 1];
          navigateToCell(itemId, nextColumn.key);
        } else if (currentIndex < items.length - 1) {
          const nextItem = items[currentIndex + 1];
          const firstColumn = visibleColumns[0];
          navigateToCell(nextItem.id, firstColumn.key);
        }
      }
    } else if (e.key === 'ArrowUp' && e.ctrlKey) {
      e.preventDefault();
      
      // Move to previous row, same column
      const prevIndex = currentIndex - 1;
      if (prevIndex >= 0) {
        const prevItem = items[prevIndex];
        navigateToCell(prevItem.id, field);
      }
    } else if (e.key === 'ArrowDown' && e.ctrlKey) {
      e.preventDefault();
      
      // Move to next row, same column
      const nextIndex = currentIndex + 1;
      if (nextIndex < items.length) {
        const nextItem = items[nextIndex];
        navigateToCell(nextItem.id, field);
      }
    }
  }, [items, visibleColumns, navigateToCell]);

  // Cleanup timeout on unmount
  const cleanup = useCallback(() => {
    if (navigationTimeoutRef.current) {
      clearTimeout(navigationTimeoutRef.current);
    }
  }, []);

  return {
    showColorPicker,
    handleToggleColorPicker,
    selectColor,
    getRowStatus,
    getColumnWidth,
    updateColumnWidth,
    cellRefs,
    editingCell,
    setEditingCell,
    handleCellClick,
    handleKeyDown,
    navigateToCell,
    cleanup
  };
};