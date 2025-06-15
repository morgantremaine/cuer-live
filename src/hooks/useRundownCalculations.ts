import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useRundownCalculations = (items: RundownItem[]) => {
  const timeToSeconds = useCallback((timeStr: string) => {
    // Handle both MM:SS and HH:MM:SS formats
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format (minutes:seconds)
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    return 0;
  }, []);

  const getRowNumber = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return '';
    
    const item = items[index];
    if (!item) return '';
    
    // Calculate row numbers based purely on position and type, not stored values
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    // For headers, count how many headers we've seen so far
    if (isHeaderItem(item)) {
      let headerCount = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i] && isHeaderItem(items[i])) {
          headerCount++;
        }
      }
      return letters[headerCount - 1] || 'A';
    }
    
    // For regular items, find which segment they belong to and count within that segment
    let currentSegmentLetter = 'A';
    let itemCountInSegment = 0;
    
    // Go through items up to current index
    for (let i = 0; i <= index; i++) {
      const currentItem = items[i];
      if (!currentItem) continue;
      
      if (isHeaderItem(currentItem)) {
        // Update which segment we're in based on header count
        let headerCount = 0;
        for (let j = 0; j <= i; j++) {
          if (items[j] && isHeaderItem(items[j])) {
            headerCount++;
          }
        }
        currentSegmentLetter = letters[headerCount - 1] || 'A';
        itemCountInSegment = 0; // Reset count for new segment
      } else {
        // This is a regular item
        itemCountInSegment++;
      }
    }
    
    return `${currentSegmentLetter}${itemCountInSegment}`;
  }, [items]);

  const calculateTotalRuntime = useCallback(() => {
    // Only include non-floated items in the total runtime calculation
    let totalSeconds = items.reduce((acc, item) => {
      // Skip floated items - they don't count towards runtime
      if (item.isFloating || item.isFloated) {
        return acc;
      }
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
  
    // Sum up durations of non-floated items until next header
    while (i < items.length && !isHeaderItem(items[i])) {
      // Only count non-floated items
      if (!items[i].isFloating && !items[i].isFloated) {
        totalSeconds += timeToSeconds(items[i].duration);
      }
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
