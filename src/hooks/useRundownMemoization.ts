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
  
  // EXTREME MEMORY OPTIMIZATION: Minimal processing for large rundowns
  const memoizedCalculations = useMemo(() => {
    const itemCount = items.length;
    
    // For large rundowns, use memory-optimized calculations while preserving functionality
    if (itemCount > 100) {
      // Return items with minimal augmentation using stored rowNumber values
      const itemsWithStatus = items.map((item) => {
        // For display optimization, use the calculated row numbers from the items
        let calculatedRowNumber = '';
        if (item.type !== 'header') {
          // Use the calculatedRowNumber if available (from calculateItemsWithTiming)
          calculatedRowNumber = (item as any).calculatedRowNumber || item.rowNumber || '';
        }
        
        return {
          ...item,
          calculatedStatus: item.id === currentSegmentId ? 'current' as const : 'upcoming' as const,
          calculatedRowNumber
        };
      });
      
      // FIXED: Lightweight but functional header durations and total runtime
      const headerDurations = new Map<string, string>();
      let totalRuntimeSeconds = 0;
      
      items.forEach((item, index) => {
        // Calculate total runtime (memory efficient)
        if (!item.isFloating && !item.isFloated && item.duration) {
          const parts = item.duration.split(':').map(Number);
          if (parts.length === 2) totalRuntimeSeconds += parts[0] * 60 + parts[1];
          if (parts.length === 3) totalRuntimeSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        
        // Calculate header durations (limit scope for memory efficiency)
        if (item.type === 'header') {
          let segmentSeconds = 0;
          for (let i = index + 1; i < Math.min(items.length, index + 20); i++) { // Limit to next 20 items for memory
            const nextItem = items[i];
            if (nextItem.type === 'header') break;
            if (!nextItem.isFloating && !nextItem.isFloated && nextItem.duration) {
              const parts = nextItem.duration.split(':').map(Number);
              if (parts.length === 2) segmentSeconds += parts[0] * 60 + parts[1];
              if (parts.length === 3) segmentSeconds += parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
          }
          const hours = Math.floor(segmentSeconds / 3600);
          const minutes = Math.floor((segmentSeconds % 3600) / 60);
          const secs = segmentSeconds % 60;
          headerDurations.set(item.id, `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`);
        }
      });
      
      const hours = Math.floor(totalRuntimeSeconds / 3600);
      const minutes = Math.floor((totalRuntimeSeconds % 3600) / 60);
      const secs = totalRuntimeSeconds % 60;
      const totalCalculatedRuntime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
      
      return {
        itemsWithStatus,
        visibleItemsOnly: items,
        headerDurations,
        totalCalculatedRuntime
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
      // For display optimization, use the calculated row numbers from the items
      let calculatedRowNumber = '';
      if (item.type !== 'header') {
        // Use the calculatedRowNumber if available (from calculateItemsWithTiming)
        calculatedRowNumber = (item as any).calculatedRowNumber || item.rowNumber || '';
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

    // Calculate header durations - lightweight for small rundowns
    const headerDurations = new Map<string, string>();
    items.forEach((item, index) => {
      if (item.type === 'header') {
        let totalSeconds = 0;
        for (let i = index + 1; i < Math.min(items.length, index + 10); i++) { // Limit to next 10 items
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
  }, [items, currentSegmentId, startTime]); // Include full items array to catch rowNumber updates

  return memoizedCalculations;
};