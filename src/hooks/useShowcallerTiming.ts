
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

    // Calculate total expected elapsed time based on real clock time
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    let expectedElapsedTotal = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing
    if (expectedElapsedTotal < 0) {
      expectedElapsedTotal += 24 * 3600; // Add 24 hours
    }

    // Calculate total actual elapsed time based on showcaller position
    // Sum up durations of all completed segments
    let actualElapsedTotal = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        actualElapsedTotal += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time within current segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
    actualElapsedTotal += elapsedInCurrentSegment;

    // Calculate the difference
    // Positive = showcaller is behind (over time), Negative = showcaller is ahead (under time)
    const differenceSeconds = actualElapsedTotal - expectedElapsedTotal;
    
    console.log('📺 Timing Debug:', {
      currentTime: currentTimeString,
      rundownStartTime,
      expectedElapsedTotal: secondsToTime(expectedElapsedTotal),
      actualElapsedTotal: secondsToTime(actualElapsedTotal),
      differenceSeconds,
      currentSegment: currentSegment.name,
      timeRemaining,
      elapsedInCurrentSegment
    });
    
    // Consider "on time" if within 5 seconds of expected time
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds < -5; // Showcaller is ahead of real time (under time)
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
