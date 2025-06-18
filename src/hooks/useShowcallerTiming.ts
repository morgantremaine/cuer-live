
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

    // Get current real time
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);
    
    // Calculate how much time has actually elapsed since rundown start time
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary - only add 24 hours if we've actually crossed midnight
    // If current time is before rundown start and the difference is large, 
    // it means rundown is later today (future), not that we crossed midnight
    if (realElapsedSeconds < 0) {
      // If the negative difference is less than 12 hours, rundown is later today
      if (Math.abs(realElapsedSeconds) < 12 * 3600) {
        // Rundown hasn't started yet - showcaller is ahead of schedule
        realElapsedSeconds = realElapsedSeconds; // Keep negative
      } else {
        // Large negative difference suggests we crossed midnight
        realElapsedSeconds += 24 * 3600;
      }
    }

    // Calculate where the showcaller currently is (total elapsed time in showcaller)
    let showcallerElapsedSeconds = 0;
    
    // Add up durations of all completed segments
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time within current segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Calculate the difference
    // Positive = showcaller is behind schedule (over time)
    // Negative = showcaller is ahead of schedule (under time)
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    
    console.log('📺 Timing Debug:', {
      currentTime: currentTimeString,
      rundownStartTime,
      currentTimeSeconds,
      rundownStartSeconds,
      realElapsedSeconds: secondsToTime(Math.abs(realElapsedSeconds)),
      realElapsedSecondsRaw: realElapsedSeconds,
      showcallerElapsedSeconds: secondsToTime(showcallerElapsedSeconds),
      differenceSeconds,
      differenceFriendly: secondsToTime(Math.abs(differenceSeconds)),
      currentSegment: currentSegment.name,
      timeRemaining,
      elapsedInCurrentSegment: secondsToTime(elapsedInCurrentSegment)
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
