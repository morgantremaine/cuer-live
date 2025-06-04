
import { useState, useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

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
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
        return [...prev, newItem];
      }
    });
    markAsChanged();
  }, [markAsChanged]);

  const addHeader = useCallback((insertAfterIndex?: number) => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    setItems(prev => {
      // Calculate the next segment letter based on existing headers
      let nextSegmentIndex = 0;
      prev.forEach(item => {
        if (isHeaderItem(item) && item.segmentName) {
          const letterIndex = letters.indexOf(item.segmentName);
          if (letterIndex >= nextSegmentIndex) {
            nextSegmentIndex = letterIndex + 1;
          }
        }
      });

      const segmentName = letters[nextSegmentIndex] || 'A';

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
        status: 'upcoming' as const,
        segmentName: segmentName
      };

      if (insertAfterIndex !== undefined && insertAfterIndex >= 0 && insertAfterIndex < prev.length) {
        const newItems = [...prev];
        newItems.splice(insertAfterIndex + 1, 0, newItem);
        return newItems;
      } else {
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

  // Use the dedicated calculation hook for these functions
  const getRowNumber = useCallback((index: number) => {
    if (!items[index]) return '1';
    
    const item = items[index];
    
    // For headers, return their segment name (A, B, C, etc.)
    if (isHeaderItem(item)) {
      return item.segmentName || 'A';
    }
    
    // For regular items, find the current segment and count within that segment
    let currentSegment = 'A';
    let regularCountInSegment = 0;
    
    // Go backwards to find the most recent header
    for (let i = index - 1; i >= 0; i--) {
      if (isHeaderItem(items[i])) {
        currentSegment = items[i].segmentName || 'A';
        break;
      }
    }
    
    // Count regular items in the current segment up to this index
    let segmentStartIndex = 0;
    for (let i = 0; i < items.length; i++) {
      if (isHeaderItem(items[i]) && items[i].segmentName === currentSegment) {
        segmentStartIndex = i + 1;
        break;
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
    const timeToSeconds = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    // Only include non-floated items in the total runtime calculation
    let totalSeconds = 0;
    
    items.forEach(item => {
      if (!isHeaderItem(item) && item.duration && !item.isFloating && !item.isFloated) {
        totalSeconds += timeToSeconds(item.duration);
      }
    });

    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((headerIndex: number) => {
    if (headerIndex < 0 || headerIndex >= items.length || !isHeaderItem(items[headerIndex])) {
      return '00:00:00';
    }
  
    const timeToSeconds = (timeStr: string) => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    let totalSeconds = 0;
    let i = headerIndex + 1;
  
    // Sum up durations of non-floated items until next header
    while (i < items.length && !isHeaderItem(items[i])) {
      // Only count non-floated items
      if (items[i].duration && !items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration);
      }
      i++;
    }
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
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
