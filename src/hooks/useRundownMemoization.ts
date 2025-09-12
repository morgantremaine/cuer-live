
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
  
  // MEMORY OPTIMIZED: Minimize expensive calculations and object creation
  const memoizedCalculations = useMemo(() => {
    const itemCount = items.length;
    
    // For large rundowns, avoid heavy calculations but preserve essential functionality
    if (itemCount > 100) {
      const headerDurations = new Map<string, string>();
      
      // CRITICAL: Row numbering is essential - calculate properly for all sizes
      const itemsWithStatus = items.map((item, index) => {
        let calculatedRowNumber = '';
        if (item.type !== 'header') {
          let regularItemCount = 0;
          for (let i = 0; i <= index; i++) {
            if (items[i]?.type !== 'header') {
              regularItemCount++;
            }
          }
          calculatedRowNumber = regularItemCount.toString();
        }
        
        return {
          ...item,
          calculatedStatus: item.id === currentSegmentId ? 'current' as const : 'upcoming' as const,
          calculatedRowNumber
        };
      });
      
      return {
        itemsWithStatus,
        visibleItemsOnly: items,
        headerDurations,
        totalCalculatedRuntime: '00:00:00' // Skip heavy calculation for large rundowns
      };
    }
    
    // Only do expensive calculations for smaller rundowns
    const timeToSeconds = (timeStr: string): number => {
      if (!timeStr) return 0;
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

    // Memory efficient: Create enhanced items only for small rundowns
    const itemsWithStatus = items.map((item, index) => {
      // Calculate row number - simplified
      let calculatedRowNumber = '';
      if (item.type !== 'header') {
        let regularItemCount = 0;
        for (let i = 0; i <= index; i++) {
          if (items[i]?.type !== 'header') {
            regularItemCount++;
          }
        }
        calculatedRowNumber = regularItemCount.toString();
      }

      // Calculate status
      const calculatedStatus: 'upcoming' | 'current' | 'completed' = 
        item.id === currentSegmentId ? 'current' : 'upcoming';

      return {
        ...item,
        calculatedStatus,
        calculatedRowNumber
      };
    });

    // Calculate header durations - lightweight
    const headerDurations = new Map<string, string>();
    items.forEach((item, index) => {
      if (item.type === 'header') {
        let totalSeconds = 0;
        for (let i = index + 1; i < Math.min(items.length, index + 20); i++) { // Limit to next 20 items
          const nextItem = items[i];
          if (nextItem.type === 'header') break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            totalSeconds += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        headerDurations.set(item.id, secondsToTime(totalSeconds));
      }
    });

    // Calculate total runtime - efficient
    const totalRuntimeSeconds = items
      .filter(item => !item.isFloating && !item.isFloated)
      .reduce((acc, item) => acc + timeToSeconds(item.duration || '00:00'), 0);
    
    const totalCalculatedRuntime = secondsToTime(totalRuntimeSeconds);

    return {
      itemsWithStatus,
      visibleItemsOnly: items,
      headerDurations,
      totalCalculatedRuntime
    };
  }, [items, currentSegmentId, startTime]); // Removed visibleColumns to reduce recalculation

  return memoizedCalculations;
};
