
import { useState, useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { timeToSeconds, secondsToTime } from '@/utils/timeUtils';

interface UseShowcallerMasterTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
  isPlaying: boolean;
  currentSegmentId: string | null;
  playbackStartTime: number | null;
}

interface TimingState {
  timeRemaining: number;
  timingStatus: {
    isOnTime: boolean;
    isAhead: boolean;
    timeDifference: string;
    isVisible: boolean;
  };
}

export const useShowcallerMasterTiming = ({
  items,
  rundownStartTime,
  isPlaying,
  currentSegmentId,
  playbackStartTime
}: UseShowcallerMasterTimingProps): TimingState => {
  const [displayTime, setDisplayTime] = useState(0);
  const [timingStatus, setTimingStatus] = useState({
    isOnTime: false,
    isAhead: false,
    timeDifference: '00:00:00',
    isVisible: false
  });

  const lastUpdateRef = useRef<number>(0);
  const stableTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate precise time remaining internally for accuracy
  const calculatePreciseTimeRemaining = useCallback((): number => {
    if (!currentSegmentId) {
      return 0;
    }

    const segment = items.find(item => item.id === currentSegmentId);
    if (!segment) return 0;

    const segmentDurationSeconds = timeToSeconds(segment.duration || '00:00');

    if (!isPlaying || !playbackStartTime) {
      return segmentDurationSeconds;
    }

    const elapsedSeconds = (Date.now() - playbackStartTime) / 1000;
    return Math.max(0, segmentDurationSeconds - elapsedSeconds);
  }, [isPlaying, currentSegmentId, playbackStartTime, items]);

  // Calculate timing status (over/under) with corrected logic
  const calculateTimingStatus = useCallback((preciseTimeRemaining: number) => {
    // Only show timing status when playing and have a valid segment
    if (!isPlaying || !currentSegmentId || !rundownStartTime || rundownStartTime === '00:00:00') {
      return {
        isOnTime: false,
        isAhead: false,
        timeDifference: '00:00:00',
        isVisible: false
      };
    }

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

    // Calculate when this segment should have started according to schedule
    let scheduledElapsedSeconds = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        scheduledElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }

    // Calculate current position in segment
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - preciseTimeRemaining;
    const totalScheduledTime = scheduledElapsedSeconds + elapsedInCurrentSegment;

    // Calculate actual elapsed time since rundown start
    const now = new Date();
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    let realElapsedSeconds: number;
    if (currentTimeSeconds >= rundownStartSeconds) {
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    } else {
      // Handle day crossing
      realElapsedSeconds = (24 * 3600) - rundownStartSeconds + currentTimeSeconds;
    }

    // Calculate difference: negative = behind schedule (over), positive = ahead of schedule (under)
    const differenceSeconds = totalScheduledTime - realElapsedSeconds;
    
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller is ahead of real time
    const timeDifference = secondsToTime(Math.abs(differenceSeconds));

    return {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };
  }, [items, rundownStartTime, isPlaying, currentSegmentId]);

  // Stable 1000ms update cycle with display buffering
  useEffect(() => {
    const updateDisplay = () => {
      const now = Date.now();
      
      // Prevent excessive updates (minimum 900ms between updates for stability)
      if (now - lastUpdateRef.current < 900) {
        return;
      }
      
      lastUpdateRef.current = now;
      
      const preciseRemaining = calculatePreciseTimeRemaining();
      const flooredTime = Math.floor(preciseRemaining); // Stable second display
      const status = calculateTimingStatus(preciseRemaining);
      
      setDisplayTime(flooredTime);
      setTimingStatus(status);
    };

    // Initial calculation (synchronous, no race condition)
    updateDisplay();

    if (isPlaying && currentSegmentId) {
      // Stable 1000ms timer for display updates
      stableTimerRef.current = setInterval(updateDisplay, 1000);
    }

    return () => {
      if (stableTimerRef.current) {
        clearInterval(stableTimerRef.current);
        stableTimerRef.current = null;
      }
    };
  }, [isPlaying, currentSegmentId, playbackStartTime, calculatePreciseTimeRemaining, calculateTimingStatus]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (stableTimerRef.current) {
        clearInterval(stableTimerRef.current);
      }
    };
  }, []);

  return {
    timeRemaining: displayTime,
    timingStatus
  };
};
