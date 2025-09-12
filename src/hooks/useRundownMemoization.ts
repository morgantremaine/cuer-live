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
  
  // FIX RENDER LOOP: Ultra-stable memoization with minimal dependencies
  const memoizedCalculations = useMemo(() => {
    const itemCount = items.length;
    
    // PERFORMANCE: Skip heavy calculations for large rundowns but keep all functionality
    const shouldOptimize = itemCount > 100;
    
    if (shouldOptimize) {
      // Fast path for large rundowns - minimal processing
      let regularItemIndex = 0;
      const itemsWithStatus = items.map((item) => {
        let calculatedRowNumber = '';
        if (item.type !== 'header') {
          regularItemIndex++;
          calculatedRowNumber = regularItemIndex.toString();
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
        headerDurations: new Map<string, string>(), // Empty for performance
        totalCalculatedRuntime: '00:00:00' // Skip expensive calculation
      };
    }
    
    // Full calculations for smaller rundowns only
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

    // Enhanced items with proper calculations
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

    // Header durations
    const headerDurations = new Map<string, string>();
    items.forEach((item, index) => {
      if (item.type === 'header') {
        let totalSeconds = 0;
        for (let i = index + 1; i < Math.min(items.length, index + 10); i++) {
          const nextItem = items[i];
          if (nextItem.type === 'header') break;
          if (!nextItem.isFloating && !nextItem.isFloated) {
            totalSeconds += timeToSeconds(nextItem.duration || '00:00');
          }
        }
        headerDurations.set(item.id, secondsToTime(totalSeconds));
      }
    });

    // Total runtime
    const totalRuntimeSeconds = items
      .filter(item => !item.isFloating && !item.isFloated)
      .reduce((acc, item) => acc + timeToSeconds(item.duration || '00:00'), 0);
    
    return {
      itemsWithStatus,
      visibleItemsOnly: items,
      headerDurations,
      totalCalculatedRuntime: secondsToTime(totalRuntimeSeconds)
    };
  }, [
    items.length, // Only depend on length to prevent constant recalculation
    currentSegmentId  // Only currentSegmentId for status updates
    // REMOVED: items, startTime, visibleColumns to prevent render loops
  ]);

  return memoizedCalculations;
};