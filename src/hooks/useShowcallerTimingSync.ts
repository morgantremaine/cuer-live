
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerTimingSyncProps {
  items: RundownItem[];
}

export const useShowcallerTimingSync = ({ items }: UseShowcallerTimingSyncProps) => {
  const timeToSeconds = useCallback((timeStr: string) => {
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
  }, []);

  const calculateSynchronizedTimeRemaining = useCallback((
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

    const segmentDuration = timeToSeconds(segment.duration || '00:00');
    const elapsedTime = Math.floor((Date.now() - externalState.playbackStartTime) / 1000);
    const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);

    console.log('📺 Timing sync calculation:', {
      segmentDuration,
      elapsedTime,
      originalTimeRemaining: externalState.timeRemaining,
      syncedTimeRemaining
    });

    return {
      ...externalState,
      timeRemaining: syncedTimeRemaining
    };
  }, [items, timeToSeconds]);

  return {
    calculateSynchronizedTimeRemaining,
    timeToSeconds
  };
};
