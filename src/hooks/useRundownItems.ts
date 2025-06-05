
import { useState, useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export type { RundownItem } from '@/types/rundown';

export const useRundownItems = (markAsChanged: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);

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
    const newItem: RundownItem = {
      id: uuidv4(),
      type: 'header',
      rowNumber: '',
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

  const deleteRow = useCallback((id: string) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => item.id !== id);
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prevItems => {
      const newItems = prevItems.filter(item => !ids.includes(item.id));
      markAsChanged();
      return newItems;
    });
  }, [markAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[]) => {
    setItems(prevItems => {
      const allItems = [...prevItems, ...newItems];
      markAsChanged();
      return allItems;
    });
  }, [markAsChanged]);

  // Much simpler getRowNumber function - fix the header letter logic
  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const item = items[index];
    if (!item) return '';
    
    // For headers, calculate their segment letter (A, B, C, etc.)
    if (item.type === 'header') {
      // Count how many headers come before this one (including this one)
      let headerCount = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i]?.type === 'header') {
          headerCount++;
        }
      }
      const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      return letters[headerCount - 1] || 'A';
    }
    
    // For regular items, find which segment they're in and their number within that segment
    let segmentLetter = 'A'; // Default to segment A if no headers found
    let regularItemsInSegment = 0;
    
    // Look backwards to find the most recent header to determine segment
    for (let i = index - 1; i >= 0; i--) {
      if (items[i]?.type === 'header') {
        // Count headers up to and including this one to get segment letter
        let headerCount = 0;
        for (let j = 0; j <= i; j++) {
          if (items[j]?.type === 'header') {
            headerCount++;
          }
        }
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        segmentLetter = letters[headerCount - 1] || 'A';
        break;
      }
    }
    
    // Count regular items in this segment that come before the current item
    let foundSegmentStart = false;
    for (let i = 0; i < index; i++) {
      if (items[i]?.type === 'header') {
        // Check if this header belongs to our segment
        let headerCount = 0;
        for (let j = 0; j <= i; j++) {
          if (items[j]?.type === 'header') {
            headerCount++;
          }
        }
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const thisHeaderSegment = letters[headerCount - 1] || 'A';
        
        if (thisHeaderSegment === segmentLetter) {
          foundSegmentStart = true;
          regularItemsInSegment = 0; // Reset count when we find the start of our segment
        }
      } else if (items[i]?.type === 'regular') {
        // Only count if we're in the right segment or no headers found yet
        if (foundSegmentStart || segmentLetter === 'A') {
          // Check if this regular item is in our segment
          let itemSegment = 'A';
          for (let j = i - 1; j >= 0; j--) {
            if (items[j]?.type === 'header') {
              let headerCount = 0;
              for (let k = 0; k <= j; k++) {
                if (items[k]?.type === 'header') {
                  headerCount++;
                }
              }
              const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
              itemSegment = letters[headerCount - 1] || 'A';
              break;
            }
          }
          
          if (itemSegment === segmentLetter) {
            regularItemsInSegment++;
          }
        }
      }
    }
    
    return `${segmentLetter}${regularItemsInSegment + 1}`;
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

  // Simplified calculateHeaderDuration function
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
