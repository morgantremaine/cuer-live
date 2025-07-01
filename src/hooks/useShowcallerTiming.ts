
import { useMemo } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerMasterTiming } from './useShowcallerMasterTiming';

interface UseShowcallerTimingProps {
  items: RundownItem[];
  rundownStartTime: string;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime?: number | null;
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
  playbackStartTime = null
}: UseShowcallerTimingProps): TimingStatus => {
  
  // Use the master timing hook for consistent calculations
  const { timingStatus } = useShowcallerMasterTiming({
    items,
    rundownStartTime,
    isPlaying,
    currentSegmentId,
    playbackStartTime
  });

  return timingStatus;
};
