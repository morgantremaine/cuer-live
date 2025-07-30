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

    // FIX: Use browser time instead of faulty Universal Time Service
    // The Universal Time Service has a 3-hour error, but browser time is correct
    const browserTime = Date.now();
    const currentTimeString = formatInTimeZone(browserTime, timezone, 'HH:mm:ss');
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    console.log('🕐 FIXED - Using browser time:');
    console.log('  Browser time in Riyadh:', currentTimeString);
    console.log('  Rundown start time:', rundownStartTime);
    console.log('  Current time seconds:', currentTimeSeconds);
    console.log('  Start time seconds:', rundownStartSeconds);
    
    // Real elapsed time = how much time has passed since the rundown started
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    console.log('  Raw difference (current - start):', realElapsedSeconds);
    
    // Handle day boundary (if we're "before" start time, might have crossed midnight)
    if (realElapsedSeconds < 0) {
      console.log('  NEGATIVE TIME - adding 24 hours for day boundary');
      realElapsedSeconds += 24 * 3600; // Add 24 hours
    }
    
    console.log('  Final real elapsed seconds:', realElapsedSeconds);

    // Calculate showcaller elapsed time = where the showcaller thinks we are
    let showcallerElapsedSeconds = 0;
    
    // Add durations of all completed segments (before current segment)
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        const itemDuration = timeToSeconds(item.duration || '00:00');
        showcallerElapsedSeconds += itemDuration;
        console.log(`  Added completed segment ${i}: ${item.name} duration: ${itemDuration}s`);
      }
    }
    
    // Add elapsed time in current segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = Math.max(0, currentSegmentDuration - timeRemaining);
    showcallerElapsedSeconds += elapsedInCurrentSegment;
    
    console.log('  Current segment duration:', currentSegmentDuration);
    console.log('  Time remaining in current:', timeRemaining);
    console.log('  Elapsed in current segment:', elapsedInCurrentSegment);
    console.log('  Total showcaller elapsed:', showcallerElapsedSeconds);

    // Calculate the difference
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    
    console.log('  FINAL CALCULATION:');
    console.log('  Showcaller position:', showcallerElapsedSeconds, 'seconds');
    console.log('  Real elapsed time:', realElapsedSeconds, 'seconds');
    console.log('  Difference:', differenceSeconds, 'seconds');
    console.log('  Showcaller is ahead:', differenceSeconds > 0);
    console.log('  Should show:', differenceSeconds > 0 ? 'Under' : 'Over', secondsToTime(Math.abs(differenceSeconds)));

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