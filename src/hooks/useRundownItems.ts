import { useState, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export type { RundownItem } from '@/types/rundown';

export const useRundownItems = (markAsChanged: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);

  // Helper function to renumber all headers in sequence
  const renumberItems = useCallback((items: RundownItem[]) => {
    let headerIndex = 0;
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    return items.map(item => {
      if (item.type === 'header') {
        const newHeaderLetter = letters[headerIndex] || 'A';
        headerIndex++;
        return {
          ...item,
          rowNumber: newHeaderLetter
        };
      } else {
        return item;
      }
    });
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<RundownItem>) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, ...updates } : item
      );
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: any, insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'regular',
      rowNumber: '',
      name: '',
      startTime: '',
      duration: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false
    };

    setItems(prevItems => {
      let newItems;
      if (insertAfterIndex !== undefined) {
        newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
      } else {
        newItems = [...prevItems, newItem];
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    setItems(prevItems => {
      const newItem: RundownItem = {
        id: uuidv4(),
        type: 'header',
        rowNumber: 'A', // Will be renumbered below
        name: 'New Header',
        startTime: '',
        duration: '',
        endTime: '',
        elapsedTime: '',
        talent: '',
        script: '',
        gfx: '',
        video: '',
        notes: '',
        color: '',
        isFloating: false
      };

      let newItems;
      if (insertAfterIndex !== undefined) {
        newItems = [...prevItems];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
      } else {
        newItems = [...prevItems, newItem];
      }
      
      // Renumber all headers after adding the new one
      const renumberedItems = renumberItems(newItems);
      
      markAsChanged();
      return renumberedItems;
    });
  }, [markAsChanged, renumberItems]);

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const itemToDelete = prevItems.find(item => item.id === id);
      const newItems = prevItems.filter(item => item.id !== id);
      
      // If we deleted a header, renumber all remaining headers
      if (itemToDelete?.type === 'header') {
        const renumberedItems = renumberItems(newItems);
        markAsChanged();
        return renumberedItems;
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged, renumberItems]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const itemsToDelete = prevItems.filter(item => ids.includes(item.id));
      const hasHeaderDeleted = itemsToDelete.some(item => item.type === 'header');
      const newItems = prevItems.filter(item => !ids.includes(item.id));
      
      // If any deleted item was a header, renumber all remaining headers
      if (hasHeaderDeleted) {
        const renumberedItems = renumberItems(newItems);
        markAsChanged();
        return renumberedItems;
      }
      
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged, renumberItems]);

  const addMultipleRows = useCallback((newItems: RundownItem[]) => {
    setItems(prevItems => {
      const allItems = [...prevItems, ...newItems];
      markAsChanged();
      return allItems;
    });
  }, [markAsChanged]);

  // Change back to useCallback but force re-calculation by making it depend on items
  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const item = items[index];
    if (!item) return '';
    
    // For headers, count how many headers we've seen so far
    if (item.type === 'header') {
      let headerCount = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i]?.type === 'header') {
          headerCount++;
        }
      }
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[headerCount - 1] || 'A';
    }
    
    // For regular items, find which segment they belong to
    let currentSegmentLetter = 'A';
    let itemCountInSegment = 0;
    
    // Go through items up to current index
    for (let i = 0; i <= index; i++) {
      const currentItem = items[i];
      if (!currentItem) continue;
      
      if (currentItem.type === 'header') {
        // Update which segment we're in
        let headerCount = 0;
        for (let j = 0; j <= i; j++) {
          if (items[j]?.type === 'header') {
            headerCount++;
          }
        }
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        currentSegmentLetter = letters[headerCount - 1] || 'A';
        itemCountInSegment = 0; // Reset count for new segment
      } else if (currentItem.type === 'regular') {
        itemCountInSegment++;
      }
    }
    
    return `${currentSegmentLetter}${itemCountInSegment}`;
  }, [items]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      );
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const calculateTotalRuntime = useCallback(() => {
    let totalSeconds = 0;
    items.forEach(item => {
      if (item.type === 'regular' && item.duration) {
        const duration = item.duration;
        const parts = duration.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          totalSeconds += minutes * 60 + seconds;
        }
      }
    });
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [items]);

  const calculateHeaderDuration = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const headerItem = items[index];
    if (!headerItem || headerItem.type !== 'header') return '';
    
    let totalSeconds = 0;
    
    // Sum up durations of all regular items after this header until the next header
    for (let i = index + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') break; // Stop at next header
      
      if (item.type === 'regular' && item.duration) {
        const duration = item.duration;
        const parts = duration.split(':');
        if (parts.length === 2) {
          const minutes = parseInt(parts[0]) || 0;
          const seconds = parseInt(parts[1]) || 0;
          totalSeconds += minutes * 60 + seconds;
        }
      }
    }
    
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }, [items]);

  return {
    items,
    setItems,
    updateItem,
    addRow,
    addHeader,
    deleteRow,
    deleteMultipleRows,
    addMultipleRows,
    getRowNumber,
    toggleFloatRow,
    calculateTotalRuntime,
    calculateHeaderDuration
  };
};
