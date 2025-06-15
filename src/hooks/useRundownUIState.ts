
import { useState, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

export const useRundownUIState = (
  items: RundownItem[],
  visibleColumns: Column[],
  updateItem: (id: string, field: string, value: string) => void,
  setColumns: (columns: Column[]) => void,
  columns: Column[]
) => {
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);
  const cellRefs = useRef<{ [key: string]: HTMLInputElement | HTMLTextAreaElement }>({});

  const handleToggleColorPicker = useCallback((itemId: string | null) => {
    setShowColorPicker(prev => prev === itemId ? null : itemId);
  }, []);

  const selectColor = useCallback((id: string, color: string) => {
    updateItem(id, 'color', color);
    setShowColorPicker(null);
  }, [updateItem]);

  const getRowStatus = useCallback((item: RundownItem) => {
    if (item.status) return item.status;
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

  const handleCellClick = useCallback((
    itemId: string,
    field: string,
    event: React.MouseEvent
  ) => {
    const cellKey = `${itemId}-${field}`;
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
    const { key, shiftKey, ctrlKey, metaKey } = event;
    
    // Handle navigation keys
    if (key === 'Enter' || key === 'Tab') {
      event.preventDefault();
      
      // Find next cell
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
      
      // Ensure we stay within bounds
      if (nextItemIndex >= 0 && nextItemIndex < items.length && nextFieldIndex >= 0) {
        const nextItem = items[nextItemIndex];
        const nextField = visibleColumns[nextFieldIndex];
        
        if (nextItem && nextField) {
          const nextCellKey = `${nextItem.id}-${nextField.key}`;
          const nextCellElement = cellRefs.current[nextCellKey];
          
          if (nextCellElement) {
            setTimeout(() => {
              nextCellElement.focus();
              if (nextCellElement instanceof HTMLInputElement || nextCellElement instanceof HTMLTextAreaElement) {
                nextCellElement.select();
              }
            }, 10);
          }
        }
      }
    }
  }, [items, visibleColumns]);

  return {
    showColorPicker,
    cellRefs,
    handleToggleColorPicker,
    selectColor,
    getRowStatus,
    getColumnWidth,
    updateColumnWidth,
    handleCellClick,
    handleKeyDown
  };
};

