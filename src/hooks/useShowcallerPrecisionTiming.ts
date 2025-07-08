
import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerPrecisionTimingProps {
  items: RundownItem[];
}

export const useShowcallerPrecisionTiming = ({ items }: UseShowcallerPrecisionTimingProps) => {
  const baseTimeRef = useRef<number | null>(null);
  const driftCompensationRef = useRef<number>(0);
  const lastSyncTimeRef = useRef<number>(0);

  // Convert time string to milliseconds for precision
  const timeToMilliseconds = useCallback((timeStr: string): number => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    
    if (parts.length === 2) {
      const [minutes, seconds] = parts;
      return (minutes * 60 + seconds) * 1000;
    } else if (parts.length === 3) {
      const [hours, minutes, seconds] = parts;
      return (hours * 3600 + minutes * 60 + seconds) * 1000;
    }
    return 0;
  }, []);

  // Get high-precision current time
  const getPreciseTime = useCallback((): number => {
    return performance.now() + performance.timeOrigin;
  }, []);

  // Simplified precise time remaining calculation without drift compensation
  const calculatePreciseTimeRemaining = useCallback((
    segmentId: string,
    playbackStartTime: number,
    isPlaying: boolean
  ): number => {
    if (!isPlaying || !playbackStartTime || !segmentId) {
      const segment = items.find(item => item.id === segmentId);
      return segment ? timeToMilliseconds(segment.duration || '00:00') : 0;
    }

    const segment = items.find(item => item.id === segmentId);
    if (!segment) return 0;

    const segmentDurationMs = timeToMilliseconds(segment.duration || '00:00');
    const currentTime = getPreciseTime();
    const elapsedMs = currentTime - playbackStartTime;
    
    // Simple, accurate calculation without drift compensation
    const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);

    return remainingMs;
  }, [items, timeToMilliseconds, getPreciseTime]);

  // Simplified playback start calculation without drift compensation
  const calculatePrecisePlaybackStart = useCallback((
    previousSegmentId: string | null,
    previousPlaybackStartTime: number | null,
    transitionTime: number
  ): number => {
    const preciseTransitionTime = getPreciseTime();
    
    console.log('📺 Precise timing transition:', {
      previousSegmentId,
      actualTransitionTime: preciseTransitionTime
    });

    return preciseTransitionTime;
  }, [getPreciseTime]);

  // Reset with enhanced initialization
  const resetDriftCompensation = useCallback(() => {
    driftCompensationRef.current = 0;
    baseTimeRef.current = null;
    lastSyncTimeRef.current = Date.now();
  }, []);

  // Enhanced external state synchronization with immediate precision
  const synchronizeWithExternalState = useCallback((
    externalState: any
  ): any => {
    if (!externalState.isPlaying || !externalState.playbackStartTime || !externalState.currentSegmentId) {
      return externalState;
    }

    const segment = items.find(item => item.id === externalState.currentSegmentId);
    if (!segment) {
      console.warn('📺 Cannot sync timing - segment not found:', externalState.currentSegmentId);
      return externalState;
    }

    const preciseRemaining = calculatePreciseTimeRemaining(
      externalState.currentSegmentId,
      externalState.playbackStartTime,
      externalState.isPlaying
    );

    // Convert to seconds with consistent floor rounding to prevent timing jumps
    const preciseSeconds = Math.floor(preciseRemaining / 1000);

    console.log('📺 Enhanced precision timing sync:', {
      externalTimeRemaining: externalState.timeRemaining,
      calculatedPreciseRemaining: preciseRemaining,
      roundedSeconds: preciseSeconds,
      differenceMs: Math.abs(externalState.timeRemaining * 1000 - preciseRemaining)
    });

    return {
      ...externalState,
      timeRemaining: preciseSeconds
    };
  }, [items, calculatePreciseTimeRemaining]);

  return {
    timeToMilliseconds,
    getPreciseTime,
    calculatePreciseTimeRemaining,
    calculatePrecisePlaybackStart,
    resetDriftCompensation,
    synchronizeWithExternalState
  };
};
