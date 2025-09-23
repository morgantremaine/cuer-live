
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime, secondsToTimeNoWrap } from '@/utils/rundownCalculations';

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
    
    // Calculate timing for all items - elapsed time INCLUDING current item's duration
    let cumulativeDurationSeconds = 0;
    const itemsWithTiming = items.map((item, index) => {
      const startTimeForItem = secondsToTime(currentTimeSeconds);
      const durationSeconds = item.type === 'header' ? 0 : timeToSeconds(item.duration || '00:00');
      const endTimeForItem = secondsToTime(currentTimeSeconds + durationSeconds);
      
      // Only advance timeline for non-floated regular items
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        currentTimeSeconds += durationSeconds;
        totalRuntimeSeconds += durationSeconds;
        // Add to cumulative duration (now BEFORE calculating elapsed time for broadcast-style display)
        cumulativeDurationSeconds += durationSeconds;
      }
      
      // Elapsed time INCLUDING this item's duration (where we'll be after this item completes)
      const elapsedTime = secondsToTimeNoWrap(cumulativeDurationSeconds);

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
        headerDurations.set(item.id, secondsToTimeNoWrap(segmentDuration)); // Use no-wrap for header duration
      }
    });

    return {
      itemsWithTiming,
      totalRuntime: secondsToTimeNoWrap(totalRuntimeSeconds), // Use no-wrap for total runtime
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
