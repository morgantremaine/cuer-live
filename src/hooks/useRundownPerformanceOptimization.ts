
import { useMemo, useEffect } from 'react';
import { useMemoryMonitor } from './useMemoryMonitor';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';

interface UseRundownPerformanceOptimizationProps {
  items: RundownItem[];
  columns: Column[];
  startTime: string;
  numberingLocked?: boolean;
  lockedRowNumbers?: { [itemId: string]: string };
  endTime?: string;
}

export const useRundownPerformanceOptimization = ({
  items,
  columns,
  startTime,
  numberingLocked,
  lockedRowNumbers,
  endTime
}: UseRundownPerformanceOptimizationProps) => {
  
  // Performance monitoring for large rundowns
  const itemCount = items?.length || 0;
  const isLargeRundown = itemCount > 100;
  const isVeryLargeRundown = itemCount > 200;
  
  // Memory monitoring with toast notifications
  useMemoryMonitor({
    rundownId: 'current', // Could be made more specific
    itemCount,
    enabled: isLargeRundown
  });
  
  // Memory usage warning
  useEffect(() => {
    if (isVeryLargeRundown && typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      
      if (usedMB > 500) {
        // Silently monitor high memory usage without console warnings
      }
    }
  }, [itemCount, isVeryLargeRundown]);
  
  // Performance-optimized calculated items with caching for large rundowns
  const calculatedItems = useMemo(() => {
    if (isVeryLargeRundown) {
      // Silently using performance-optimized calculations
    }
    return calculateItemsWithTiming(items, startTime || '00:00:00', numberingLocked, lockedRowNumbers, endTime);
  }, [items, startTime, numberingLocked, lockedRowNumbers, endTime, isVeryLargeRundown, itemCount]);

  // Calculate visible columns (memoized to prevent unnecessary re-renders)
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.isVisible !== false);
  }, [columns]);

  // Calculate total runtime
  const totalRuntime = useMemo(() => {
    return calculateTotalRuntime(items);
  }, [items]);

  // Performance-optimized getRowNumber with Map lookup for large rundowns
  const rowNumberMap = useMemo(() => {
    if (!isLargeRundown) return null; // Use direct access for small rundowns
    
    const map = new Map<number, string>();
    calculatedItems.forEach((item, index) => {
      if (item?.calculatedRowNumber) {
        map.set(index, item.calculatedRowNumber);
      }
    });
    return map;
  }, [calculatedItems, isLargeRundown]);

  const getRowNumber = useMemo(() => {
    return (index: number) => {
      if (index < 0 || index >= calculatedItems.length) return '';
      
      // Use Map lookup for large rundowns, direct access for small ones
      if (rowNumberMap) {
        return rowNumberMap.get(index) || '';
      }
      
      return calculatedItems[index]?.calculatedRowNumber || '';
    };
  }, [calculatedItems, rowNumberMap]);

  // Create optimized getHeaderDuration function
  const getHeaderDuration = useMemo(() => {
    return (index: number) => {
      return calculateHeaderDuration(items, index);
    };
  }, [items]);

  // Create optimized calculateHeaderDuration function (for compatibility)
  const calculateHeaderDurationMemo = useMemo(() => {
    return (index: number) => {
      return calculateHeaderDuration(items, index);
    };
  }, [items]);

  return {
    calculatedItems,
    visibleColumns,
    totalRuntime,
    getRowNumber,
    getHeaderDuration,
    calculateHeaderDuration: calculateHeaderDurationMemo
  };
};
