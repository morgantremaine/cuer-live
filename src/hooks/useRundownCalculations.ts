
import { useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { generateHeaderLabel, checkRowsBeforeFirstHeader } from '@/utils/headerUtils';

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
    
    // Check if there are regular rows before the first header
    const hasRowsBeforeFirstHeader = checkRowsBeforeFirstHeader(items);
    
    // For headers, count how many headers we've seen so far
    if (isHeaderItem(item)) {
      let headerCount = 0;
      for (let i = 0; i <= index; i++) {
        if (items[i] && isHeaderItem(items[i])) {
          headerCount++;
        }
      }
      // Adjust header numbering based on whether there are rows before first header
      const headerIndex = hasRowsBeforeFirstHeader ? headerCount : headerCount - 1;
      return generateHeaderLabel(headerIndex);
    }
    
    // For regular items, find which segment they belong to and count within that segment
    let currentSegmentLetter = 'A';
    let itemCountInSegment = 0;
    let segmentHeaderCount = hasRowsBeforeFirstHeader ? 1 : 0; // Start from A or B
    
    // Go through items up to current index
    for (let i = 0; i <= index; i++) {
      const currentItem = items[i];
      if (!currentItem) continue;
      
      if (isHeaderItem(currentItem)) {
        // Update which segment we're in
        currentSegmentLetter = generateHeaderLabel(segmentHeaderCount);
        segmentHeaderCount++;
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
