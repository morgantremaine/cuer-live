
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

    // Determine if we're before or after the rundown start time
    const isPreStart = currentTimeSeconds < rundownStartSeconds;
    
    let differenceSeconds: number;
    let realElapsedSeconds: number;
    
    if (isPreStart) {
      // PRE-START LOGIC: Rundown hasn't started yet
      // Real elapsed time is negative (we're before the start)
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      
      // Don't apply day boundary logic for pre-start
      // The difference shows how far ahead showcaller is compared to when it should be
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
      
      console.log('📺 PRE-START Timing Debug:', {
        currentTime: currentTimeString,
        rundownStartTime,
        currentTimeSeconds,
        rundownStartSeconds,
        realElapsedSeconds: `${realElapsedSeconds < 0 ? '-' : ''}${secondsToTime(Math.abs(realElapsedSeconds))}`,
        showcallerElapsedSeconds: secondsToTime(showcallerElapsedSeconds),
        differenceSeconds,
        differenceFriendly: secondsToTime(Math.abs(differenceSeconds)),
        currentSegment: currentSegment.name,
        timeRemaining,
        elapsedInCurrentSegment: secondsToTime(elapsedInCurrentSegment)
      });
    } else {
      // POST-START LOGIC: Rundown has started
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      
      // Handle day boundary crossing only for post-start
      if (realElapsedSeconds < 0) {
        realElapsedSeconds += 24 * 3600;
      }
      
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
      
      console.log('📺 POST-START Timing Debug:', {
        currentTime: currentTimeString,
        rundownStartTime,
        currentTimeSeconds,
        rundownStartSeconds,
        realElapsedSeconds: secondsToTime(realElapsedSeconds),
        showcallerElapsedSeconds: secondsToTime(showcallerElapsedSeconds),
        differenceSeconds,
        differenceFriendly: secondsToTime(Math.abs(differenceSeconds)),
        currentSegment: currentSegment.name,
        timeRemaining,
        elapsedInCurrentSegment: secondsToTime(elapsedInCurrentSegment)
      });
    }
    
    // CORRECT LOGIC:
    // Positive difference = showcaller is ahead of where it should be = UNDER time
    // Negative difference = showcaller is behind where it should be = OVER time
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller is ahead = under time
    
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
