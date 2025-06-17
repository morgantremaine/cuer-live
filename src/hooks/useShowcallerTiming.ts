
import { useState, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

interface UseShowcallerTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
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
  isPlaying,
  currentSegmentId,
  timeRemaining
}: UseShowcallerTimingProps): TimingStatus => {
  const [baseTime, setBaseTime] = useState<Date | null>(null);
  const [lastTimeRemaining, setLastTimeRemaining] = useState<number>(timeRemaining);

  // Set base time when showcaller starts or segment changes
  useEffect(() => {
    if (isPlaying && currentSegmentId && !baseTime) {
      setBaseTime(new Date());
      setLastTimeRemaining(timeRemaining);
    }
    
    // Reset base time when stopping or changing segments
    if (!isPlaying || !currentSegmentId) {
      setBaseTime(null);
    }
  }, [isPlaying, currentSegmentId, baseTime, timeRemaining]);

  // Update base time and last time remaining when timeRemaining changes significantly
  useEffect(() => {
    if (isPlaying && Math.abs(timeRemaining - lastTimeRemaining) > 2) {
      setBaseTime(new Date());
      setLastTimeRemaining(timeRemaining);
    }
  }, [timeRemaining, lastTimeRemaining, isPlaying]);

  const timingStatus = useMemo(() => {
    // Only show when playing and we have a current segment
    if (!isPlaying || !currentSegmentId || !rundownStartTime || !baseTime) {
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

    // Calculate when this segment should have started
    let expectedElapsedToSegmentStart = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        expectedElapsedToSegmentStart += timeToSeconds(item.duration || '00:00');
      }
    }

    // Get current segment duration
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    
    // Calculate actual elapsed time within the current segment
    // Use stable calculation based on when we started tracking
    const elapsedSinceBase = (new Date().getTime() - baseTime.getTime()) / 1000;
    const actualElapsedInSegment = (lastTimeRemaining - timeRemaining) + elapsedSinceBase;
    
    // Calculate expected elapsed time within current segment based on rundown schedule
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    const segmentScheduledStartTime = rundownStartSeconds + expectedElapsedToSegmentStart;
    
    // Get current time in seconds
    const now = new Date();
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    
    // Handle day boundary crossing
    let adjustedCurrentTime = currentTimeSeconds;
    if (currentTimeSeconds < rundownStartSeconds) {
      adjustedCurrentTime += 24 * 3600; // Add 24 hours
    }
    
    // Calculate expected elapsed time within current segment
    const expectedElapsedInSegment = Math.max(0, adjustedCurrentTime - segmentScheduledStartTime);
    
    // Calculate the difference (positive = over time, negative = under time)
    const differenceSeconds = actualElapsedInSegment - expectedElapsedInSegment;
    
    // Round to nearest second to prevent flickering
    const roundedDifference = Math.round(differenceSeconds);
    
    // Consider "on time" if within 2 seconds of expected time
    const isOnTime = Math.abs(roundedDifference) <= 2;
    const isAhead = roundedDifference < -2; // Showcaller is ahead of schedule
    const absoluteDifference = Math.abs(roundedDifference);
    const timeDifference = secondsToTime(absoluteDifference);

    return {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId, baseTime, timeRemaining, lastTimeRemaining]);

  return timingStatus;
};
