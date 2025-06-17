
import { useState, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

interface UseShowcallerTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
  isPlaying: boolean;
  currentSegmentId: string | null;
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
  currentSegmentId
}: UseShowcallerTimingProps): TimingStatus => {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every second when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

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

    // Calculate expected elapsed time from rundown start to current segment start
    let expectedElapsedToSegmentStart = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        expectedElapsedToSegmentStart += timeToSeconds(item.duration || '00:00');
      }
    }

    // Get current segment duration and calculate how much time should have elapsed within it
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    
    // Find how much time has elapsed in the current segment by looking at remaining time
    // This is tricky - we need to get this from the showcaller state somehow
    // For now, let's calculate based on the assumption that if we're in this segment,
    // we should compare against where we should be at the END of this segment
    const expectedElapsedTotal = expectedElapsedToSegmentStart + currentSegmentDuration;

    // Get current real time
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    
    // Calculate rundown start time in seconds
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    // Calculate actual elapsed time since rundown start
    let actualElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing
    if (actualElapsedSeconds < 0) {
      actualElapsedSeconds += 24 * 3600; // Add 24 hours
    }
    
    // Calculate the difference (positive = behind schedule, negative = ahead)
    // We compare against where we should be at the END of the current segment
    const differenceSeconds = actualElapsedSeconds - expectedElapsedTotal;
    
    // Consider "on time" if within 1 second of expected time
    const isOnTime = Math.abs(differenceSeconds) <= 1;
    const isAhead = differenceSeconds < -1;
    const absoluteDifference = Math.abs(differenceSeconds);
    const timeDifference = secondsToTime(absoluteDifference);

    return {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId, currentTime]);

  return timingStatus;
};
