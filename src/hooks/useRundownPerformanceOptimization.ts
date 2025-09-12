
import { useMemo, useEffect } from 'react';
import { useMemoryMonitor } from './useMemoryMonitor';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/types/columns';
import { calculateItemsWithTiming, calculateTotalRuntime, calculateHeaderDuration } from '@/utils/rundownCalculations';

interface UseRundownPerformanceOptimizationProps {
  items: RundownItem[];
  columns: Column[];
  startTime: string;
}

export const useRundownPerformanceOptimization = ({
  items,
  columns,
  startTime
}: UseRundownPerformanceOptimizationProps) => {
  
  // Performance monitoring for large rundowns
  const itemCount = items?.length || 0;
  const isLargeRundown = itemCount > 100;
  const isVeryLargeRundown = itemCount > 200;
  
  // Memory monitoring with toast notifications
  const { forceCheck } = useMemoryMonitor({
    rundownId: 'current', // Could be made more specific
    itemCount,
    enabled: isLargeRundown
  });
  
  // Aggressive optimization for very large rundowns during typing
  const shouldUseAggressiveOptimization = isVeryLargeRundown;
  
  // Memory usage warning
  useEffect(() => {
    if (isVeryLargeRundown && typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      
      if (usedMB > 500) {
        console.warn(`⚠️ High memory usage detected: ${usedMB}MB with ${itemCount} items`);
        console.log('💡 Consider optimizing rundown size or enable performance mode');
      }
    }
  }, [itemCount, isVeryLargeRundown]);
  
  // Performance-optimized calculated items with caching for large rundowns
  const calculatedItems = useMemo(() => {
    if (isVeryLargeRundown) {
      console.log('🚀 Using performance-optimized calculations for', itemCount, 'items');
    }
    return calculateItemsWithTiming(items, startTime || '00:00:00');
  }, [items, startTime, isVeryLargeRundown, itemCount]);

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
    calculateHeaderDuration: calculateHeaderDurationMemo,
    shouldUseAggressiveOptimization,
    forceMemoryCheck: forceCheck
  };
};
