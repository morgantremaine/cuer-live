
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { Column } from '@/hooks/useUserColumnPreferences';
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
  
  // Calculate all derived values with proper header numbering
  const calculatedItems = useMemo(() => {
    return calculateItemsWithTiming(items, startTime || '00:00:00');
  }, [items, startTime]);

  // Calculate visible columns (memoized to prevent unnecessary re-renders)
  const visibleColumns = useMemo(() => {
    return columns.filter(col => col.isVisible !== false);
  }, [columns]);

  // Calculate total runtime
  const totalRuntime = useMemo(() => {
    return calculateTotalRuntime(items);
  }, [items]);

  // Create optimized getRowNumber function that uses calculated values
  const getRowNumber = useMemo(() => {
    return (index: number) => {
      if (index < 0 || index >= calculatedItems.length) return '';
      return calculatedItems[index]?.calculatedRowNumber || '';
    };
  }, [calculatedItems]);

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
