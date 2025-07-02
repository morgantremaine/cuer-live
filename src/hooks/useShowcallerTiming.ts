
import { useState, useEffect, useMemo, useRef } from 'react';
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
  const lastCalculatedDifferenceRef = useRef<number>(0);
  const stableTimeDifferenceRef = useRef<string>('00:00:00');
  const lastUpdateTimeRef = useRef<number>(0);

  // Update current time every 100ms when playing for better precision
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying]);

  // Immediate timing calculation on play start
  useEffect(() => {
    if (isPlaying && currentSegmentId) {
      setCurrentTime(new Date());
    }
  }, [isPlaying, currentSegmentId]);

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

    // Get current time in seconds (floored to whole seconds)
    const now = currentTime;
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = Math.floor(timeToSeconds(currentTimeString));
    const rundownStartSeconds = Math.floor(timeToSeconds(rundownStartTime));

    // Calculate where the showcaller currently is (total elapsed time in showcaller)
    let showcallerElapsedSeconds = 0;
    
    // Add up durations of all completed segments
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += Math.floor(timeToSeconds(item.duration || '00:00'));
      }
    }
    
    // Add elapsed time within current segment (use integer timeRemaining)
    const currentSegmentDuration = Math.floor(timeToSeconds(currentSegment.duration || '00:00'));
    const elapsedInCurrentSegment = currentSegmentDuration - Math.floor(timeRemaining);
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Check if we're before or after the rundown start time
    const isPreStart = currentTimeSeconds < rundownStartSeconds;
    
    let differenceSeconds: number;
    let realElapsedSeconds: number;
    
    if (isPreStart) {
      // PRE-START LOGIC: Show hasn't started yet
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds; // This will be negative
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    } else {
      // POST-START LOGIC: Show has started
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      
      // Apply day boundary logic if needed
      if (realElapsedSeconds < 0) {
        realElapsedSeconds += 24 * 3600; // Handle day crossing
      }
      
      differenceSeconds = showcallerElapsedSeconds - realElapsedSeconds;
    }
    
    // Floor the difference to prevent jumping between fractional seconds
    const flooredDifference = Math.floor(differenceSeconds);
    
    // Only update if the difference has changed by at least 1 full second
    // AND we haven't updated in the last 800ms (prevents rapid changes)
    const now_ms = Date.now();
    const timeSinceLastUpdate = now_ms - lastUpdateTimeRef.current;
    
    let finalDifferenceSeconds: number;
    
    if (Math.abs(flooredDifference - lastCalculatedDifferenceRef.current) >= 1 && timeSinceLastUpdate >= 800) {
      // Significant change and enough time has passed
      lastCalculatedDifferenceRef.current = flooredDifference;
      lastUpdateTimeRef.current = now_ms;
      finalDifferenceSeconds = flooredDifference;
      
      // Update stable display
      const absoluteDifference = Math.abs(finalDifferenceSeconds);
      stableTimeDifferenceRef.current = secondsToTime(absoluteDifference);
    } else {
      // Use the last calculated difference to maintain stability
      finalDifferenceSeconds = lastCalculatedDifferenceRef.current;
    }
    
    // TIMING LOGIC with consistent precision
    const isOnTime = Math.abs(finalDifferenceSeconds) <= 5;
    const isAhead = finalDifferenceSeconds > 5; // Showcaller ahead of schedule = under time

    const newStatus = {
      isOnTime,
      isAhead,
      timeDifference: stableTimeDifferenceRef.current,
      isVisible: true
    };
    
    return newStatus;
  }, [items, rundownStartTime, isPlaying, currentSegmentId, currentTime, timeRemaining]);

  return timingStatus;
};
