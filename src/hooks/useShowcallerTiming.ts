import { useMemo, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';
import { useUniversalTiming } from './useUniversalTiming';
import { useRawRundownItems } from './useRawRundownItems';
import { formatInTimeZone } from 'date-fns-tz';

interface UseShowcallerTimingProps {
  items: RundownItem[]; // For finding current segment
  rundownId: string | null; // For loading raw timing data
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
  rundownId,
  rundownStartTime,
  timezone,
  isPlaying,
  currentSegmentId,
  timeRemaining
}: UseShowcallerTimingProps): TimingStatus => {
  const stableDisplayRef = useRef<string>('00:00:00');
  const { getUniversalTime, isTimeSynced } = useUniversalTiming();
  
  // Get raw items for consistent timing calculations across all users
  const { rawItems } = useRawRundownItems(rundownId);

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

    // Use Universal Time Service with smart fallback to browser time
    const universalTime = getUniversalTime();
    const browserTime = Date.now();
    
    // Check if Universal Time Service has a reasonable time (not more than 1 hour off from browser)
    const timeDifference = Math.abs(universalTime - browserTime);
    const useUniversalTime = isTimeSynced && timeDifference < 3600000; // 1 hour tolerance
    
    const timeToUse = useUniversalTime ? universalTime : browserTime;
    
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
    
    // CRITICAL: Use raw database items for timing calculations to ensure consistency across all users
    // This prevents timing differences due to user-specific column filtering or other UI preferences
    const timingItems = rawItems.length > 0 ? rawItems : items; // Fallback to UI items if raw not loaded yet
    
    console.log(`⏱️ Timing calculation using ${rawItems.length > 0 ? 'RAW DATABASE' : 'UI FILTERED'} items (${timingItems.length} total)`);
    if (rawItems.length > 0 && rawItems.length !== items.length) {
      console.warn(`⚠️ Timing mismatch detected: RAW=${rawItems.length} vs UI=${items.length} items - this could cause timing differences!`);
    }
    
    // Find current segment index in the timing items
    const timingCurrentSegmentIndex = timingItems.findIndex(item => item.id === currentSegmentId);
    if (timingCurrentSegmentIndex === -1) {
      console.warn(`⚠️ Current segment ${currentSegmentId} not found in timing items`);
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }
    
    // Add durations of all completed segments (before current segment) using raw data
    for (let i = 0; i < timingCurrentSegmentIndex; i++) {
      const item = timingItems[i];
      // Only count regular items that aren't floating/floated for timing
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        const itemDuration = timeToSeconds(item.duration || '00:00');
        showcallerElapsedSeconds += itemDuration;
        console.log(`⏱️ Adding segment ${i}: "${item.name}" (${item.duration}) = +${itemDuration}s, total: ${showcallerElapsedSeconds}s`);
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
  }, [items, rundownStartTime, timezone, isPlaying, currentSegmentId, timeRemaining, getUniversalTime]);

  return timingStatus;
};