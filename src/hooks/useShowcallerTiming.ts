
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

  // Update current time every second when playing - but with more precision
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying]);

  const timingStatus = useMemo(() => {
    // Only show when all required data is available
    if (!isPlaying || !currentSegmentId || !rundownStartTime || timeRemaining === undefined) {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

    // Find current segment and validate it exists
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

    // Get current real time with higher precision
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    // Calculate showcaller elapsed time more accurately
    let showcallerElapsedSeconds = 0;
    
    // Add up durations of all completed segments (only non-floated regular segments)
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }
    
    // Add elapsed time within current segment using the precise timeRemaining
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Enhanced timing calculation with better day boundary handling
    const isPreStart = currentTimeSeconds < rundownStartSeconds;
    
    let differenceSeconds: number;
    let realElapsedSeconds: number;
    
    if (isPreStart) {
      // PRE-START: Show hasn't started yet
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds; // Negative value
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    } else {
      // POST-START: Show has started
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      
      // Handle day boundary crossing
      if (realElapsedSeconds < 0) {
        realElapsedSeconds += 24 * 3600;
      }
      
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    }
    
    // Enhanced timing logic with tighter tolerances
    const isOnTime = Math.abs(differenceSeconds) <= 3; // Reduced from 5 to 3 seconds
    const isAhead = differenceSeconds > 3; // More precise threshold
    
    const absoluteDifference = Math.abs(differenceSeconds);
    const timeDifference = secondsToTime(absoluteDifference);

    // Only log timing calculations every 10 seconds to reduce console spam
    if (showcallerElapsedSeconds % 10 === 0) {
      console.log('📺 Timing calculation:', {
        currentSegment: currentSegment.name,
        showcallerElapsed: showcallerElapsedSeconds,
        realElapsed: realElapsedSeconds,
        difference: differenceSeconds,
        isOnTime,
        isAhead,
        timeDifference
      });
    }

    return {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId, currentTime, timeRemaining]);

  return timingStatus;
};
