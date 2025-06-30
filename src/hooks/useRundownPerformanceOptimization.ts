
import { useMemo, useCallback } from 'react';
import { RundownItem, isHeaderItem } from '@/types/rundown';
import { Column } from '@/hooks/useColumnsManager';

interface UseRundownPerformanceOptimizationProps {
  items: RundownItem[];
  columns: Column[];
  startTime: string;
}

// Memoized calculation helpers to reduce repeated work
export const useRundownPerformanceOptimization = ({
  items,
  columns,
  startTime
}: UseRundownPerformanceOptimizationProps) => {
  
  // Memoize time calculation functions to avoid recreating them
  const timeCalculators = useMemo(() => {
    const timeToSeconds = (timeStr: string): number => {
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

    const secondsToTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return { timeToSeconds, secondsToTime };
  }, []); // These functions never change

  // Memoize calculated items with times and row numbers
  const calculatedItems = useMemo(() => {
    const { timeToSeconds, secondsToTime } = timeCalculators;
    let currentTime = startTime || '00:00:00';
    const startTimeSeconds = timeToSeconds(startTime || '00:00:00');
    
    return items.map((item, index) => {
      const itemStartTime = currentTime;
      let itemEndTime = currentTime;
      
      if (!isHeaderItem(item)) {
        const durationSeconds = timeToSeconds(item.duration || '00:00');
        const startSeconds = timeToSeconds(currentTime);
        itemEndTime = secondsToTime(startSeconds + durationSeconds);
        
        // Only advance timeline for non-floated items
        if (!item.isFloating && !item.isFloated) {
          currentTime = itemEndTime;
        }
      }

      // Calculate elapsed time
      const elapsedSeconds = timeToSeconds(itemStartTime) - startTimeSeconds;
      const elapsedTime = secondsToTime(Math.max(0, elapsedSeconds));

      // Calculate row number
      let rowNumber = item.rowNumber || '';
      if (!isHeaderItem(item)) {
        let currentSegment = 'A';
        let itemCountInSegment = 0;

        for (let i = 0; i <= index; i++) {
          const currentItem = items[i];
          if (isHeaderItem(currentItem)) {
            currentSegment = currentItem.rowNumber || 'A';
            itemCountInSegment = 0;
          } else {
            itemCountInSegment++;
          }
        }
        rowNumber = `${currentSegment}${itemCountInSegment}`;
      }

      return {
        ...item,
        calculatedStartTime: itemStartTime,
        calculatedEndTime: itemEndTime,
        calculatedElapsedTime: elapsedTime,
        calculatedRowNumber: rowNumber
      };
    });
  }, [items, startTime, timeCalculators]);

  // Memoize visible columns filter
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.isVisible !== false);
  }, [columns]);

  // Memoize total runtime calculation
  const totalRuntime = useMemo(() => {
    const { timeToSeconds, secondsToTime } = timeCalculators;
    const totalSeconds = items.reduce((acc, item) => {
      if (isHeaderItem(item) || item.isFloating || item.isFloated) return acc;
      return acc + timeToSeconds(item.duration || '00:00');
    }, 0);
    return secondsToTime(totalSeconds);
  }, [items, timeCalculators]);

  // Memoize header durations map
  const headerDurations = useMemo(() => {
    const { timeToSeconds, secondsToTime } = timeCalculators;
    const durations = new Map<string, string>();
    
    items.forEach((item, index) => {
      if (isHeaderItem(item)) {
        let segmentSeconds = 0;
        for (let i = index + 1; i < items.length; i++) {
          const nextItem = items[i];
          if (isHeaderItem(nextItem)) break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            segmentSeconds += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        durations.set(item.id, secondsToTime(segmentSeconds));
      }
    });
    
    return durations;
  }, [items, timeCalculators]);

  // Memoized helper functions
  const getRowNumber = useCallback((index: number) => {
    return calculatedItems[index]?.calculatedRowNumber || '';
  }, [calculatedItems]);

  const getHeaderDuration = useCallback((itemId: string) => {
    return headerDurations.get(itemId) || '00:00:00';
  }, [headerDurations]);

  const calculateHeaderDuration = useCallback((index: number) => {
    const item = calculatedItems[index];
    return item && isHeaderItem(item) ? getHeaderDuration(item.id) : '00:00:00';
  }, [calculatedItems, getHeaderDuration]);

  return {
    // Enhanced items with calculated fields
    calculatedItems,
    visibleColumns,
    totalRuntime,
    
    // Memoized helper functions
    getRowNumber,
    getHeaderDuration,
    calculateHeaderDuration,
    
    // Performance metrics (for debugging)
    itemCount: items.length,
    columnCount: columns.length,
    visibleColumnCount: visibleColumns.length
  };
};
