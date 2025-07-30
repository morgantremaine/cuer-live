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

    // SIMPLIFIED: Get current time in the rundown's timezone
    const universalTime = getUniversalTime();
    const currentTimeString = formatInTimeZone(universalTime, timezone, 'HH:mm:ss');
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    // Calculate real elapsed time since rundown start
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing (if negative and > 12 hours, likely crossed midnight)
    if (realElapsedSeconds < -12 * 3600) {
      realElapsedSeconds += 24 * 3600;
    }

    // Calculate showcaller position: sum of completed segments + elapsed in current segment
    let showcallerElapsedSeconds = 0;
    
    // Add durations of all completed segments
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time in current segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = Math.max(0, currentSegmentDuration - timeRemaining);
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Calculate difference: positive = showcaller ahead of real time, negative = showcaller behind
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    
    console.log('🕐 SIMPLE timing calculation:', {
      currentTime: currentTimeString,
      rundownStart: rundownStartTime,
      realElapsed: realElapsedSeconds,
      showcallerElapsed: showcallerElapsedSeconds,
      difference: differenceSeconds,
      isShowcallerAhead: differenceSeconds > 0
    });

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
  }, [items, rundownStartTime, timezone, isPlaying, currentSegmentId, timeRemaining, getUniversalTime]);

  return timingStatus;
};