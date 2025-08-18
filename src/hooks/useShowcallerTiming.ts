import { useMemo, useRef } from 'react';
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
  const { getUniversalTime, isTimeSynced, getTimeDrift } = useUniversalTiming();

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

    // ALWAYS use Universal Time Service as the single source of truth
    const timeToUse = getUniversalTime();
    
    // Debug timing if requested
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('debugTiming') === '1') {
      console.log('🕒 Timing Debug:', {
        universalTime: getUniversalTime(),
        browserTime: Date.now(),
        isTimeSynced,
        timeDrift: getTimeDrift(),
        timeToUse,
        rundownStartTime,
        currentSegmentId,
        timeRemaining
      });
    }
    
    // Validate timeToUse before using with formatInTimeZone (fix for date-fns-tz v3)
    if (!timeToUse || isNaN(timeToUse) || timeToUse <= 0) {
      console.warn('⚠️ Invalid time value in useShowcallerTiming:', timeToUse);
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }
    
    const currentTimeString = formatInTimeZone(timeToUse, timezone, 'HH:mm:ss');
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    // Calculate real elapsed time since rundown start
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Store both day boundary options for smart selection
    const originalRealElapsed = realElapsedSeconds;
    const crossMidnightForward = realElapsedSeconds < 0 ? realElapsedSeconds + 24 * 3600 : realElapsedSeconds;
    const crossMidnightBackward = realElapsedSeconds > 12 * 3600 ? realElapsedSeconds - 24 * 3600 : realElapsedSeconds;

    // Calculate showcaller elapsed time = where the showcaller thinks we are
    let showcallerElapsedSeconds = 0;
    
    // Add durations of all completed segments (before current segment)
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        const itemDuration = timeToSeconds(item.duration || '00:00');
        showcallerElapsedSeconds += itemDuration;
      }
    }
    
    // Add elapsed time in current segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = Math.max(0, currentSegmentDuration - timeRemaining);
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Now choose the real elapsed time interpretation that gives the smallest absolute difference
    const diff1 = Math.abs(showcallerElapsedSeconds - originalRealElapsed);
    const diff2 = Math.abs(showcallerElapsedSeconds - crossMidnightForward);
    const diff3 = Math.abs(showcallerElapsedSeconds - crossMidnightBackward);
    
    // Choose the interpretation with the smallest difference
    if (diff1 <= diff2 && diff1 <= diff3) {
      realElapsedSeconds = originalRealElapsed;
    } else if (diff2 <= diff3) {
      realElapsedSeconds = crossMidnightForward;
    } else {
      realElapsedSeconds = crossMidnightBackward;
    }

    // Calculate the final difference
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;

    // Update display value
    const absSeconds = Math.abs(differenceSeconds);
    stableDisplayRef.current = secondsToTime(Math.floor(absSeconds));
    
    // Determine status
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller ahead of real time

    return {
      isOnTime,
      isAhead,
      timeDifference: stableDisplayRef.current,
      isVisible: true
    };
  }, [items, rundownStartTime, timezone, isPlaying, currentSegmentId, timeRemaining, getUniversalTime, isTimeSynced, getTimeDrift]);

  return timingStatus;
};