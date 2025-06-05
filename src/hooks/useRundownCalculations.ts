
import { useCallback, useMemo } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';

export const useRundownCalculations = (items: RundownItem[]) => {
  const timeToSeconds = useCallback((timeStr: string | undefined | null) => {
    // Handle null, undefined, or empty string values
    if (!timeStr || typeof timeStr !== 'string') return 0;
    
    // Handle both MM:SS and HH:MM:SS formats
    const parts = timeStr.split(':').map(Number);
    if (parts.length === 2) {
      // MM:SS format (minutes:seconds)
      const [minutes, seconds] = parts;
      return (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return (isNaN(hours) ? 0 : hours) * 3600 + (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
    }
    return 0;
  }, []);

  // Stable segment name calculation based on header positions
  const segmentNameMap = useMemo(() => {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const map = new Map<number, string>();
    let headerCount = 0;
    
    items.forEach((item, index) => {
      if (isHeaderItem(item)) {
        map.set(index, letters[headerCount] || 'A');
        headerCount++;
      }
    });
    
    return map;
  }, [items]);

  const getRowNumber = useCallback((index: number) => {
    const item = items[index];
    if (!item) return '1';
    
    // For headers, return their segment name (A, B, C, etc.)
    if (isHeaderItem(item)) {
      return segmentNameMap.get(index) || 'A';
    }
    
    // For regular items, find the current segment and count within that segment
    let currentSegment = 'A';
    let regularCountInSegment = 0;
    
    // Go backwards to find the most recent header
    for (let i = index - 1; i >= 0; i--) {
      if (isHeaderItem(items[i])) {
        currentSegment = segmentNameMap.get(i) || 'A';
        break;
      }
    }
    
    // Count regular items in the current segment up to this index
    let segmentStartIndex = 0;
    // Find where this segment starts
    for (let i = 0; i <= index; i++) {
      if (isHeaderItem(items[i]) && segmentNameMap.get(i) === currentSegment) {
        segmentStartIndex = i + 1;
        break;
      }
    }
    
    // Count regular items from segment start to current index
    for (let i = segmentStartIndex; i < index; i++) {
      if (i < items.length && !isHeaderItem(items[i])) {
        regularCountInSegment++;
      }
    }
    
    return `${currentSegment}${regularCountInSegment + 1}`;
  }, [items, segmentNameMap]);

  const calculateTotalRuntime = useCallback(() => {
    // Only include non-floated items in the total runtime calculation
    let totalSeconds = items.reduce((acc, item) => {
      // Skip floated items and headers - they don't count towards runtime
      if (item.isFloating || item.isFloated || isHeaderItem(item)) {
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

  // Stable function to calculate proper segment names based on header position
  const calculateSegmentName = useCallback((headerIndex: number) => {
    return segmentNameMap.get(headerIndex) || 'A';
  }, [segmentNameMap]);

  return {
    getRowNumber,
    calculateTotalRuntime,
    calculateHeaderDuration,
    calculateSegmentName,
    timeToSeconds
  };
};
