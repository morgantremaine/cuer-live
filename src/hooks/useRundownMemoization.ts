
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';

interface MemoizedCalculations {
  itemsWithStatus: Array<RundownItem & { 
    calculatedStatus: 'upcoming' | 'current' | 'completed';
    calculatedRowNumber: string;
  }>;
  visibleItemsOnly: RundownItem[];
  headerDurations: Map<string, string>;
  totalCalculatedRuntime: string;
}

export const useRundownMemoization = (
  items: RundownItem[],
  visibleColumns: Column[],
  currentSegmentId: string | null,
  startTime: string
): MemoizedCalculations => {
  
  // Memoize expensive calculations that rarely change
  const memoizedCalculations = useMemo(() => {
    const timeToSeconds = (timeStr: string): number => {
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) return parts[0] * 60 + parts[1];
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
      return 0;
    };

    const secondsToTime = (seconds: number): string => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    // Calculate items with enhanced data only once
    const itemsWithStatus = items.map((item, index) => {
      // Calculate row number - new simple numbering system
      let calculatedRowNumber = '';
      if (item.type === 'header') {
        // Headers don't have row numbers
        calculatedRowNumber = '';
      } else {
        // Regular items get sequential numbers, ignoring headers
        let regularItemCount = 0;
        for (let i = 0; i <= index; i++) {
          if (items[i]?.type !== 'header') {
            regularItemCount++;
          }
        }
        calculatedRowNumber = regularItemCount.toString();
      }

      // Calculate status
      let calculatedStatus: 'upcoming' | 'current' | 'completed' = 'upcoming';
      if (item.id === currentSegmentId) {
        calculatedStatus = 'current';
      }
      // Add more sophisticated status logic here if needed

      return {
        ...item,
        calculatedStatus,
        calculatedRowNumber
      };
    });

    // Calculate header durations
    const headerDurations = new Map<string, string>();
    items.forEach((item, index) => {
      if (item.type === 'header') {
        let totalSeconds = 0;
        for (let i = index + 1; i < items.length; i++) {
          const nextItem = items[i];
          if (nextItem.type === 'header') break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            totalSeconds += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        headerDurations.set(item.id, secondsToTime(totalSeconds));
      }
    });

    // Calculate total runtime
    const totalRuntimeSeconds = items
      .filter(item => !item.isFloating && !item.isFloated)
      .reduce((acc, item) => {
        const duration = item.duration || '00:00';
        const seconds = timeToSeconds(duration);
        return acc + seconds;
      }, 0);
    
    const totalCalculatedRuntime = secondsToTime(totalRuntimeSeconds);

    // Filter visible items (could be used for further optimization)
    const visibleItemsOnly = items; // For now, keep all items

    return {
      itemsWithStatus,
      visibleItemsOnly,
      headerDurations,
      totalCalculatedRuntime
    };
  }, [items, currentSegmentId, startTime]);

  return memoizedCalculations;
};
