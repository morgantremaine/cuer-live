
import { useState, useEffect, useMemo, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';
import { useUniversalTiming } from './useUniversalTiming';
import { formatInTimeZone } from 'date-fns-tz';

interface UseShowcallerTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
  timezone: string;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
}

interface TimingStatus {
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
  isVisible: boolean;
}

export const useShowcallerTiming = ({
  items,
  rundownStartTime,
  timezone,
  isPlaying,
  currentSegmentId,
  timeRemaining
}: UseShowcallerTimingProps): TimingStatus => {
  const stableDisplayRef = useRef<string>('00:00:00');
  const lastCalculationRef = useRef<number>(0);
  const { getUniversalTime, isTimeSynced } = useUniversalTiming();

  const timingStatus = useMemo(() => {
    // Only show when playing and we have a current segment
    if (!isPlaying || !currentSegmentId || !rundownStartTime) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    // Find current segment and its index
    const currentSegmentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentSegmentIndex === -1) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    const currentSegment = items[currentSegmentIndex];
    if (!currentSegment || currentSegment.type !== 'regular') {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    // CRITICAL FIX: Proper timezone handling without double-conversion
    // The universal time service already gives us the correct UTC time
    // We need to convert BOTH current time AND rundown start time consistently
    const universalTime = getUniversalTime();
    
    console.log('🕐 Showcaller timing debug:', {
      universalTime: new Date(universalTime).toISOString(),
      timezone,
      rundownStartTime,
      isTimeSynced
    });
    
    // Convert both current time and rundown start time to the same timezone for comparison
    const currentTimeInTimezone = formatInTimeZone(universalTime, timezone, 'HH:mm:ss');
    const currentTimeSeconds = timeToSeconds(currentTimeInTimezone);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    console.log('🕐 Time comparison:', {
      currentTimeInTimezone,
      currentTimeSeconds,
      rundownStartTime,
      rundownStartSeconds,
      rawDifference: currentTimeSeconds - rundownStartSeconds
    });

    // Show warning if time sync hasn't completed yet
    if (!isTimeSynced) {
      console.warn('⚠️ Timing calculation may be inaccurate - time sync not completed');
    }

    // Calculate showcaller position: sum of all completed segments + elapsed in current segment
    let showcallerElapsedSeconds = 0;
    
    // Add up durations of all completed segments
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time in current segment (use timeRemaining from state manager)
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Calculate real elapsed time since rundown start using UTC to ensure consistency
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing more intelligently
    if (realElapsedSeconds < 0) {
      // Check if this could be a day boundary crossing vs rundown not started yet
      const absTimeDiff = Math.abs(realElapsedSeconds);
      
      // If we're more than 12 hours behind, likely crossed midnight (day boundary)
      // If we're less than 12 hours behind, rundown probably hasn't started yet
      if (absTimeDiff > 12 * 3600) {
        realElapsedSeconds += 24 * 3600;
      }
      // For times less than 12 hours behind, keep the negative value (rundown not started)
    }
    
    // Calculate the difference (showcaller position vs real time)
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    
    // Only update display if the difference has changed significantly (prevent flickering)
    const flooredDifference = Math.floor(Math.abs(differenceSeconds));
    if (Math.abs(flooredDifference - lastCalculationRef.current) >= 1) {
      lastCalculationRef.current = flooredDifference;
      stableDisplayRef.current = secondsToTime(flooredDifference);
    }
    
    // Determine timing status
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller ahead of real time

    return {
      isOnTime,
      isAhead,
      timeDifference: stableDisplayRef.current,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId, timeRemaining]);

  return timingStatus;
};
