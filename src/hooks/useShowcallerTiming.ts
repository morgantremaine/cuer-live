
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

    // Calculate real elapsed time since rundown start
    let realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    
    // Handle day boundary crossing
    if (realElapsedSeconds < 0) {
      realElapsedSeconds += 24 * 3600;
    }

    // Calculate the difference - CORRECTED LOGIC
    // If showcaller is at 5 minutes but real time is at 6 minutes since start:
    // showcallerElapsedSeconds = 300, realElapsedSeconds = 360
    // differenceSeconds = 300 - 360 = -60 (showcaller is 60 seconds behind real time = OVER by 60 seconds)
    // 
    // If showcaller is at 7 minutes but real time is at 6 minutes since start:
    // showcallerElapsedSeconds = 420, realElapsedSeconds = 360  
    // differenceSeconds = 420 - 360 = +60 (showcaller is 60 seconds ahead of real time = UNDER by 60 seconds)
    const differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    
    // CORRECTED: 
    // Positive difference = showcaller ahead of real time = UNDER time
    // Negative difference = showcaller behind real time = OVER time  
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller is ahead of real time = under time
    
    console.log('📺 Timing Debug:', {
      currentTime: currentTimeString,
      rundownStartTime,
      currentTimeSeconds,
      rundownStartSeconds,
      realElapsedSeconds: secondsToTime(realElapsedSeconds),
      showcallerElapsedSeconds: secondsToTime(showcallerElapsedSeconds),
      differenceSeconds,
      differenceFriendly: secondsToTime(Math.abs(differenceSeconds)),
      isOnTime,
      isAhead: isAhead ? 'UNDER (ahead of real time)' : 'OVER (behind real time)',
      currentSegment: currentSegment.name,
      timeRemaining,
      elapsedInCurrentSegment: secondsToTime(elapsedInCurrentSegment)
    });
    
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
