
import { useCallback, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds } from './useRundownCalculations/timeUtils';
import { createSegmentNameMap, calculateRowNumber } from './useRundownCalculations/segmentUtils';
import { calculateTotalRuntime, calculateHeaderDuration } from './useRundownCalculations/calculationUtils';

export const useRundownCalculations = (items: RundownItem[]) => {
  // Stable segment name calculation based on header positions
  const segmentNameMap = useMemo(() => {
    return createSegmentNameMap(items);
  }, [items]);

  const getRowNumber = useCallback((index: number) => {
    return calculateRowNumber(index, items, segmentNameMap);
  }, [items, segmentNameMap]);

  const calculateTotalRuntimeMemo = useCallback(() => {
    return calculateTotalRuntime(items);
  }, [items]);

  const calculateHeaderDurationMemo = useCallback((index: number) => {
    return calculateHeaderDuration(index, items);
  }, [items]);

  // Stable function to calculate proper segment names based on header position
  const calculateSegmentName = useCallback((headerIndex: number) => {
    return segmentNameMap.get(headerIndex) || 'A';
  }, [segmentNameMap]);

  return {
    getRowNumber,
    calculateTotalRuntime: calculateTotalRuntimeMemo,
    calculateHeaderDuration: calculateHeaderDurationMemo,
    calculateSegmentName,
    timeToSeconds
  };
};
