import { useState, useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { v4 as uuidv4 } from 'uuid';

export const useRundownItems = (markAsChanged: () => void) => {
  const [items, setItems] = useState<RundownItem[]>([]);

  const updateItem = useCallback((id: string, field: string, value: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, [field]: value } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  const addRow = useCallback((calculateEndTime: (startTime: string, duration: string) => string, insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'regular',
      rowNumber: '',
      name: '',
      duration: '00:01:00',
      startTime: '00:00:00',
      endTime: '00:01:00',
      elapsedTime: '00:00:00',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      status: 'upcoming' as const
    };

    setItems(prev => {
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        // Insert after the specified index (insertAfterIndex + 1 position)
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        // Add at the end if no valid index provided
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    const newItem: RundownItem = {
      id: `header_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'header',
      rowNumber: '',
      name: 'New Header',
      duration: '',
      startTime: '',
      endTime: '',
      elapsedTime: '',
      talent: '',
      script: '',
      gfx: '',
      video: '',
      notes: '',
      color: '',
      isFloating: false,
      status: 'upcoming' as const
    };

    setItems(prev => {
      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        // Insert after the specified index (insertAfterIndex + 1 position)
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        // Add at the end if no valid index provided
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const deleteRow = useCallback((id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
    markAsChanged();
  }, [markAsChanged]);

  const deleteMultipleRows = useCallback((ids: string[]) => {
    setItems(prev => prev.filter(item => !ids.includes(item.id)));
    markAsChanged();
  }, [markAsChanged]);

  const addMultipleRows = useCallback((newItems: RundownItem[], calculateEndTime: (startTime: string, duration: string) => string) => {
    setItems(prev => [...prev, ...newItems]);
    markAsChanged();
  }, [markAsChanged]);

  const toggleFloatRow = useCallback((id: string) => {
    setItems(prev => 
      prev.map(item => 
        item.id === id ? { ...item, isFloating: !item.isFloating } : item
      )
    );
    markAsChanged();
  }, [markAsChanged]);

  const getRowNumber = useCallback((index: number) => {
    if (!items[index]) return '1';
    
    const item = items[index];
    
    // For headers, return their segment name (A, B, C, etc.)
    if (isHeaderItem(item)) {
      return item.segmentName || item.rowNumber || 'A';
    }
    
    // For regular items, find the current segment and count within that segment
    let currentSegment = 'A';
    let regularCountInSegment = 0;
    
    // Go backwards to find the most recent header
    for (let i = index - 1; i >= 0; i--) {
      if (isHeaderItem(items[i])) {
        currentSegment = items[i].segmentName || items[i].rowNumber || 'A';
        break;
      }
    }
    
    // Count regular items in the current segment up to this index
    let segmentStartIndex = 0;
    for (let i = 0; i < items.length; i++) {
      if (isHeaderItem(items[i])) {
        if ((items[i].segmentName || items[i].rowNumber) === currentSegment) {
          segmentStartIndex = i + 1;
          break;
        }
      }
    }
    
    for (let i = segmentStartIndex; i < index; i++) {
      if (!isHeaderItem(items[i])) {
        regularCountInSegment++;
      }
    }
    
    return `${currentSegment}${regularCountInSegment + 1}`;
  }, [items]);

  const calculateTotalRuntime = useCallback(() => {
    // Only include non-floated items in the total runtime calculation
    let totalMinutes = 0;
    
    items.forEach(item => {
      if (item.type === 'regular' && item.duration && !item.isFloating && !item.isFloated) {
        const [hours, minutes, seconds] = item.duration.split(':').map(Number);
        totalMinutes += hours * 60 + minutes + seconds / 60;
      }
    });

    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((headerIndex: number) => {
    if (headerIndex < 0 || headerIndex >= items.length || !isHeaderItem(items[headerIndex])) {
      return '00:00:00';
    }
  
    let totalMinutes = 0;
    let i = headerIndex + 1;
  
    // Sum up durations of non-floated items until next header
    while (i < items.length && !isHeaderItem(items[i])) {
      // Only count non-floated items
      if (items[i].duration && !items[i].isFloating && !items[i].isFloated) {
        const [hours, minutes, seconds] = items[i].duration.split(':').map(Number);
        totalMinutes += hours * 60 + minutes + seconds / 60;
      }
      i++;
    }
  
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    const seconds = Math.floor((totalMinutes % 1) * 60);
  
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
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
