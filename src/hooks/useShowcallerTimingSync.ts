
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerPrecisionTiming } from './useShowcallerPrecisionTiming';

interface UseShowcallerTimingSyncProps {
  items: RundownItem[];
}

export const useShowcallerTimingSync = ({ items }: UseShowcallerTimingSyncProps) => {
  const { 
    timeToMilliseconds,
    synchronizeWithExternalState 
  } = useShowcallerPrecisionTiming({ items });

  // Legacy compatibility - convert milliseconds back to seconds
  const timeToSeconds = useCallback((timeStr: string) => {
    return Math.round(timeToMilliseconds(timeStr) / 1000);
  }, [timeToMilliseconds]);

  // Use the precision timing utility for synchronization
  const calculateSynchronizedTimeRemaining = useCallback((
    externalState: any
  ): any => {
    return synchronizeWithExternalState(externalState);
  }, [synchronizeWithExternalState]);

  return {
    calculateSynchronizedTimeRemaining,
    timeToSeconds
  };
};
