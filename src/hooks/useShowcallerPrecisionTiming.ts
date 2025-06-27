
import { useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerPrecisionTimingProps {
  items: RundownItem[];
}

export const useShowcallerPrecisionTiming = ({ items }: UseShowcallerPrecisionTimingProps) => {
  const baseTimeRef = useRef<number | null>(null);
  const driftCompensationRef = useRef<number>(0);

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

  // Calculate precise time remaining with drift compensation
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
    
    // Apply drift compensation
    const compensatedElapsed = elapsedMs + driftCompensationRef.current;
    const remainingMs = Math.max(0, segmentDurationMs - compensatedElapsed);

    return remainingMs;
  }, [items, timeToMilliseconds, getPreciseTime]);

  // Calculate precise playback start time for segment transitions
  const calculatePrecisePlaybackStart = useCallback((
    previousSegmentId: string | null,
    previousPlaybackStartTime: number | null,
    transitionTime: number
  ): number => {
    if (!previousSegmentId || !previousPlaybackStartTime) {
      return getPreciseTime();
    }

    const previousSegment = items.find(item => item.id === previousSegmentId);
    if (!previousSegment) {
      return getPreciseTime();
    }

    const previousDurationMs = timeToMilliseconds(previousSegment.duration || '00:00');
    const idealEndTime = previousPlaybackStartTime + previousDurationMs;
    
    // Calculate drift and compensate
    const actualTransitionTime = transitionTime;
    const drift = actualTransitionTime - idealEndTime;
    driftCompensationRef.current += drift;

    console.log('📺 Timing precision:', {
      previousDuration: previousDurationMs,
      idealEndTime,
      actualTransitionTime,
      drift,
      totalDriftCompensation: driftCompensationRef.current
    });

    return actualTransitionTime;
  }, [items, timeToMilliseconds, getPreciseTime]);

  // Reset drift compensation
  const resetDriftCompensation = useCallback(() => {
    driftCompensationRef.current = 0;
    baseTimeRef.current = null;
  }, []);

  // Synchronize with external timing data
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

    console.log('📺 Precision timing sync:', {
      externalTimeRemaining: externalState.timeRemaining,
      calculatedPreciseRemaining: preciseRemaining,
      differenceMs: Math.abs(externalState.timeRemaining * 1000 - preciseRemaining)
    });

    return {
      ...externalState,
      timeRemaining: Math.round(preciseRemaining / 1000) // Convert back to seconds for display
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
