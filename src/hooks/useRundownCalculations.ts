
import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useRundownCalculations = (items: RundownItem[]) => {
  const timeToSeconds = useCallback((timeStr: string) => {
    // Handle both HH:MM and HH:MM:SS formats
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // HH:MM format
      const [hours, minutes] = parts;
      return hours * 3600 + minutes * 60;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }, []);

  const getRowNumber = useCallback((index: number) => {
    const item = items[index];
    if (!item) return '1';
    
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
    let totalSeconds = items.reduce((acc, item) => {
      return acc + timeToSeconds(item.duration);
    }, 0);
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items, timeToSeconds]);

  const calculateHeaderDuration = useCallback((index: number) => {
    if (index < 0 || index >= items.length || !isHeaderItem(items[index])) {
      return '00:00:00';
    }
  
    let totalSeconds = 0;
    let i = index + 1;
  
    while (i < items.length && !isHeaderItem(items[i])) {
      totalSeconds += timeToSeconds(items[i].duration);
      i++;
    }
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items, timeToSeconds]);

  return {
    getRowNumber,
    calculateTotalRuntime,
    calculateHeaderDuration,
  };
};
