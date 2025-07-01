
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerPrecisionTimingProps {
  items: RundownItem[];
}

export const useShowcallerPrecisionTiming = ({ items }: UseShowcallerPrecisionTimingProps) => {
  console.log('📺 useShowcallerPrecisionTiming - now integrated into consolidated timing system');

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

  // Simplified synchronization - now handled by consolidated timing
  const synchronizeWithExternalState = useCallback((externalState: any): any => {
    console.log('📺 Precision timing sync now handled by consolidated system');
    
    if (!externalState.isPlaying || !externalState.playbackStartTime || !externalState.currentSegmentId) {
      return externalState;
    }

    const segment = items.find(item => item.id === externalState.currentSegmentId);
    if (!segment) {
      console.warn('📺 Cannot sync timing - segment not found:', externalState.currentSegmentId);
      return externalState;
    }

    // Simple synchronization for compatibility
    const currentTime = getPreciseTime();
    const elapsedMs = currentTime - externalState.playbackStartTime;
    const segmentDurationMs = timeToMilliseconds(segment.duration || '00:00');
    const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);
    const syncedTimeRemaining = Math.max(0, Math.ceil(remainingMs / 1000));

    console.log('📺 Legacy precision timing sync:', {
      externalTimeRemaining: externalState.timeRemaining,
      calculatedRemaining: syncedTimeRemaining,
      differenceMs: Math.abs(externalState.timeRemaining * 1000 - remainingMs)
    });

    return {
      ...externalState,
      timeRemaining: syncedTimeRemaining
    };
  }, [items, timeToMilliseconds, getPreciseTime]);

  // Legacy compatibility functions - now simplified
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
    const remainingMs = Math.max(0, segmentDurationMs - elapsedMs);

    return remainingMs;
  }, [items, timeToMilliseconds, getPreciseTime]);

  const calculatePrecisePlaybackStart = useCallback((
    previousSegmentId: string | null,
    previousPlaybackStartTime: number | null,
    transitionTime: number
  ): number => {
    // Simplified - just return current time for new segments
    return getPreciseTime();
  }, [getPreciseTime]);

  const resetDriftCompensation = useCallback(() => {
    console.log('📺 Drift compensation reset - now handled by consolidated timing');
  }, []);

  return {
    timeToMilliseconds,
    getPreciseTime,
    calculatePreciseTimeRemaining,
    calculatePrecisePlaybackStart,
    resetDriftCompensation,
    synchronizeWithExternalState
  };
};
