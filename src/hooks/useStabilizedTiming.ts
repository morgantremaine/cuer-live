
import { useState, useEffect, useRef, useMemo } from 'react';

interface UseStabilizedTimingProps {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  rundownStartTime: string;
  items: any[];
}

interface StabilizedTimingResult {
  stabilizedDifferenceSeconds: number;
  isStable: boolean;
  isOnTime: boolean;
  isAhead: boolean;
  timeDifference: string;
}

const STABILITY_THRESHOLD = 0.5; // Only update if difference is > 0.5 seconds
const BUFFER_SIZE = 5; // Keep track of last 5 calculations
const CONSISTENCY_THRESHOLD = 3; // Need 3 consistent readings to update

export const useStabilizedTiming = ({
  isPlaying,
  currentSegmentId,
  timeRemaining,
  rundownStartTime,
  items
}: UseStabilizedTimingProps): StabilizedTimingResult => {
  const [stableValue, setStableValue] = useState<number>(0);
  const calculationBufferRef = useRef<number[]>([]);
  const lastStableUpdateRef = useRef<number>(Date.now());
  const lastDisplayValueRef = useRef<number>(0);

  const stabilizedValue = useMemo(() => {
    if (!isPlaying || !currentSegmentId || !rundownStartTime) {
      return 0;
    }

    // Find current segment and its index
    const currentSegmentIndex = items.findIndex(item => item.id === currentSegmentId);
    if (currentSegmentIndex === -1) return 0;

    const currentSegment = items[currentSegmentIndex];
    if (!currentSegment || currentSegment.type !== 'regular') return 0;

    // Time conversion utilities
    const timeToSeconds = (timeStr: string): number => {
      if (!timeStr) return 0;
      const parts = timeStr.split(':').map(Number);
      if (parts.length === 2) {
        const [minutes, seconds] = parts;
        return minutes * 60 + seconds;
      } else if (parts.length === 3) {
        const [hours, minutes, seconds] = parts;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    // Get current real time with high precision
    const now = new Date();
    const currentTimeString = now.toTimeString().slice(0, 8);
    const currentTimeSeconds = timeToSeconds(currentTimeString);
    const rundownStartSeconds = timeToSeconds(rundownStartTime);

    // Calculate showcaller elapsed time
    let showcallerElapsedSeconds = 0;
    for (let i = 0; i < currentSegmentIndex; i++) {
      const item = items[i];
      if (item.type === 'regular' && !item.isFloating && !item.isFloated) {
        showcallerElapsedSeconds += timeToSeconds(item.duration || '00:00');
      }
    }

    const currentSegmentDuration = timeToSeconds(currentSegment.duration || '00:00');
    const elapsedInCurrentSegment = currentSegmentDuration - timeRemaining;
    showcallerElapsedSeconds += elapsedInCurrentSegment;

    // Calculate real elapsed time
    const isPreStart = currentTimeSeconds < rundownStartSeconds;
    let realElapsedSeconds: number;
    
    if (isPreStart) {
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
    } else {
      realElapsedSeconds = currentTimeSeconds - rundownStartSeconds;
      if (realElapsedSeconds < 0) {
        realElapsedSeconds += 24 * 3600;
      }
    }

    const rawDifference = showcallerElapsedSeconds - realElapsedSeconds;
    
    // Add to calculation buffer
    calculationBufferRef.current.push(rawDifference);
    if (calculationBufferRef.current.length > BUFFER_SIZE) {
      calculationBufferRef.current.shift();
    }

    // Calculate weighted average with more weight on recent values
    const weightedSum = calculationBufferRef.current.reduce((sum, value, index) => {
      const weight = (index + 1) / calculationBufferRef.current.length;
      return sum + (value * weight);
    }, 0);
    
    const weightSum = calculationBufferRef.current.reduce((sum, _, index) => {
      return sum + ((index + 1) / calculationBufferRef.current.length);
    }, 0);
    
    const smoothedDifference = weightedSum / weightSum;

    return Math.round(smoothedDifference);
  }, [isPlaying, currentSegmentId, timeRemaining, rundownStartTime, items]);

  // Stability check and update logic
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastUpdate = now - lastStableUpdateRef.current;
    const differenceMagnitude = Math.abs(stabilizedValue - lastDisplayValueRef.current);

    // Only update if:
    // 1. The difference is significant (> threshold), OR
    // 2. Enough time has passed for a natural update (> 2 seconds), OR
    // 3. We have enough consistent readings in the buffer
    const shouldUpdate = 
      differenceMagnitude > STABILITY_THRESHOLD ||
      timeSinceLastUpdate > 2000 ||
      (calculationBufferRef.current.length >= CONSISTENCY_THRESHOLD &&
       calculationBufferRef.current.slice(-CONSISTENCY_THRESHOLD).every(val => 
         Math.abs(Math.round(val) - stabilizedValue) <= 1
       ));

    if (shouldUpdate) {
      setStableValue(stabilizedValue);
      lastDisplayValueRef.current = stabilizedValue;
      lastStableUpdateRef.current = now;
    }
  }, [stabilizedValue]);

  // Reset when playback state changes
  useEffect(() => {
    if (!isPlaying || !currentSegmentId) {
      calculationBufferRef.current = [];
      setStableValue(0);
      lastDisplayValueRef.current = 0;
    }
  }, [isPlaying, currentSegmentId]);

  const secondsToTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const isOnTime = Math.abs(stableValue) <= 5;
  const isAhead = stableValue > 5;
  const absoluteDifference = Math.abs(stableValue);
  const timeDifference = secondsToTime(absoluteDifference);

  return {
    stabilizedDifferenceSeconds: stableValue,
    isStable: calculationBufferRef.current.length >= CONSISTENCY_THRESHOLD,
    isOnTime,
    isAhead,
    timeDifference
  };
};
