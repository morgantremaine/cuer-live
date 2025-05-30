
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

export const useRundownCalculations = (items: RundownItem[]) => {
  const getRowNumber = useCallback((index: number) => {
    // Filter out header rows to calculate the correct row number
    const regularItems = items.filter(item => item.type === 'regular');
    return String(regularItems.length > 0 ? index + 1 : 1);
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
