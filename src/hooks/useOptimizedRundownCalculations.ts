
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

interface CalculationResult {
  itemsWithTiming: RundownItem[];
  totalRuntime: string;
  headerDurations: Map<string, string>;
}

export const useOptimizedRundownCalculations = (
  items: RundownItem[],
  startTime: string
): CalculationResult => {
  return useMemo(() => {
    if (!items || !Array.isArray(items)) {
      return {
        itemsWithTiming: [],
        totalRuntime: '00:00:00',
        headerDurations: new Map()
      };
    }


    let currentTimeSeconds = timeToSeconds(startTime);
    let totalRuntimeSeconds = 0;
    const headerDurations = new Map<string, string>();
    
    // Calculate timing for all items
    const itemsWithTiming = items.map((item, index) => {
      const startTimeForItem = secondsToTime(currentTimeSeconds);
      const durationSeconds = item.type === 'header' ? 0 : timeToSeconds(item.duration || '00:00');
      const endTimeForItem = secondsToTime(currentTimeSeconds + durationSeconds);
      const elapsedSeconds = currentTimeSeconds - timeToSeconds(startTime);
      const elapsedTime = secondsToTime(Math.max(0, elapsedSeconds));

      // Only advance timeline for non-floated regular items
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        currentTimeSeconds += durationSeconds;
        totalRuntimeSeconds += durationSeconds;
      }

      return {
        ...item,
        startTime: startTimeForItem,
        endTime: endTimeForItem,
        elapsedTime,
        calculatedRowNumber: item.type === 'header' ? item.rowNumber : `${getCurrentSegment(items, index)}${getItemNumberInSegment(items, index)}`
      };
    });

    // Calculate header durations
    items.forEach((item, index) => {
      if (item.type === 'header') {
        let segmentDuration = 0;
        for (let i = index + 1; i < items.length; i++) {
          const nextItem = items[i];
          if (nextItem.type === 'header') break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            segmentDuration += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        headerDurations.set(item.id, secondsToTime(segmentDuration));
      }
    });

    return {
      itemsWithTiming,
      totalRuntime: secondsToTime(totalRuntimeSeconds),
      headerDurations
    };
  }, [items, startTime]);
};

// Helper functions
const getCurrentSegment = (items: RundownItem[], currentIndex: number): string => {
  for (let i = currentIndex; i >= 0; i--) {
    if (items[i].type === 'header') {
      return items[i].rowNumber || 'A';
    }
  }
  return 'A';
};

const getItemNumberInSegment = (items: RundownItem[], currentIndex: number): number => {
  let count = 0;
  let segmentStart = 0;
  
  // Find the start of the current segment
  for (let i = currentIndex; i >= 0; i--) {
    if (items[i].type === 'header') {
      segmentStart = i;
      break;
    }
  }
  
  // Count regular items in this segment up to current index
  for (let i = segmentStart; i <= currentIndex; i++) {
    if (items[i].type === 'regular') {
      count++;
    }
  }
  
  return count;
};
