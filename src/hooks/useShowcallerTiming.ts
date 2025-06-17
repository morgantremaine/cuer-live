
import { useState, useEffect, useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/rundownCalculations';

interface UseShowcallerTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number; // Add this to get actual showcaller state
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

    // Calculate when this segment should have started (elapsed time from rundown start to segment start)
    let expectedElapsedToSegmentStart = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        expectedElapsedToSegmentStart += timeToSeconds(item.duration || '00:00');
      }
    }

    // Get current segment duration
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    
    // Calculate actual elapsed time within the current segment using showcaller state
    const actualElapsedInSegment = currentSegmentDuration - timeRemaining;
    
    // Get current real time
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    
    // Calculate rundown start time in seconds
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    // Calculate actual elapsed time since rundown start
    let actualElapsedSinceStart = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing
    if (actualElapsedSinceStart < 0) {
      actualElapsedSinceStart += 24 * 3600; // Add 24 hours
    }
    
    // Calculate expected elapsed time within current segment based on real time
    const expectedElapsedInSegment = actualElapsedSinceStart - expectedElapsedToSegmentStart;
    
    // Calculate the difference between actual showcaller position and where it should be
    // Positive = showcaller is behind (over time), Negative = showcaller is ahead (under time)
    const differenceSeconds = actualElapsedInSegment - expectedElapsedInSegment;
    
    // Consider "on time" if within 1 second of expected time
    const isOnTime = Math.abs(differenceSeconds) <= 1;
    const isAhead = differenceSeconds < -1; // Showcaller is ahead of real time
    const absoluteDifference = Math.abs(differenceSeconds);
    const timeDifference = secondsToTime(absoluteDifference);

    return {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId, currentTime, timeRemaining]);

  return timingStatus;
};
