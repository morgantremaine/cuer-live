
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
  const lastTimingStateRef = useRef<TimingStatus | null>(null);
  const timingBufferRef = useRef<number>(0);
  const stabilizedDifferenceRef = useRef<number>(0);

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

    // Use high-precision timing calculations
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
    
    // Add elapsed time within current segment with higher precision
    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
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
    
    // Enhanced stabilization to prevent second jumping
    const rawDifference = Math.floor(differenceSeconds); // Floor to integer seconds
    
    // Use enhanced buffering to prevent rapid changes
    if (Math.abs(rawDifference - stabilizedDifferenceRef.current) <= 1) {
      // If within 1 second of last stable value, maintain stability
      const timeSinceLastChange = Math.abs(differenceSeconds - stabilizedDifferenceRef.current);
      if (timeSinceLastChange < 0.3) { // 300ms threshold for stability
        differenceSeconds = stabilizedDifferenceRef.current;
      } else {
        // Only change if we've been consistently different for a bit
        stabilizedDifferenceRef.current = rawDifference;
        differenceSeconds = rawDifference;
      }
    } else {
      // Significant change, update immediately
      stabilizedDifferenceRef.current = rawDifference;
      differenceSeconds = rawDifference;
    }
    
    // TIMING LOGIC with consistent precision
    const isOnTime = Math.abs(differenceSeconds) <= 5;
    const isAhead = differenceSeconds > 5; // Showcaller ahead of schedule = under time
    
    const absoluteDifference = Math.abs(differenceSeconds);
    const timeDifference = secondsToTime(absoluteDifference); // Now uses floored seconds

    const newStatus = {
      isOnTime,
      isAhead,
      timeDifference,
      isVisible: true
    };

    // Store last state for stability
    lastTimingStateRef.current = newStatus;
    
    return newStatus;
  }, [items, rundownStartTime, isPlaying, currentSegmentId, currentTime, timeRemaining]);

  return timingStatus;
};
