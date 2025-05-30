
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownCalculations = (items: RundownItem[]) => {
  const getRowNumber = useCallback((index: number) => {
    const item = items[index];
    if (!item) return '1';
    
    // For headers, use their segmentName or rowNumber
    if (item.type === 'header' || item.isHeader) {
      return item.segmentName || item.rowNumber || 'A';
    }
    
    // For regular items, count only regular items before this one
    let regularCount = 0;
    for (let i = 0; i < index; i++) {
      if (items[i].type === 'regular' && !items[i].isHeader) {
        regularCount++;
      }
    }
    return String(regularCount + 1);
  }, [items]);

  const calculateTotalRuntime = useCallback(() => {
    let totalSeconds = items.reduce((acc, item) => {
      const [hours, minutes, seconds] = item.duration.split(':').map(Number);
      return acc + (hours * 3600) + (minutes * 60) + seconds;
    }, 0);
  
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
  
    const formattedHours = String(hours).padStart(2, '0');
    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
  
    return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
  }, [items]);

  const calculateHeaderDuration = useCallback((index: number) => {
    if (index < 0 || index >= items.length || items[index].type !== 'header') {
      return '00:00:00';
    }
  
    let totalSeconds = 0;
    let i = index + 1;
  
    while (i < items.length && items[i].type !== 'header') {
      const [hours, minutes, seconds] = items[i].duration.split(':').map(Number);
      totalSeconds += (hours * 3600) + (minutes * 60) + seconds;
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
  }, [items]);

  return {
    getRowNumber,
    calculateTotalRuntime,
    calculateHeaderDuration,
  };
};
