
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerConsolidatedTiming } from './useShowcallerConsolidatedTiming';

// Legacy interface for backward compatibility
export interface ShowcallerVisualState {
  currentItemStatuses: Map<string, string>;
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  playbackStartTime: number | null;
  lastUpdate: string;
  controllerId: string | null;
}

interface UseShowcallerVisualStateProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
}

export const useShowcallerVisualState = ({
  items,
  rundownId,
  userId
}: UseShowcallerVisualStateProps) => {
  // Use the consolidated timing system (only log once on initialization)
  const consolidatedTiming = useShowcallerConsolidatedTiming({
    items,
    rundownId,
    userId
  });

  // Legacy compatibility functions (no logging needed)
  const getItemVisualStatus = useCallback((itemId: string) => {
    return consolidatedTiming.getItemStatus(itemId);
  }, [consolidatedTiming.getItemStatus]);

  const setItemVisualStatus = useCallback((itemId: string, status: string) => {
    // This is now handled internally by the consolidated timing system
  }, []);

  const clearAllVisualStatuses = useCallback(() => {
    // This is now handled internally by the consolidated timing system
  }, []);

  const trackOwnUpdate = useCallback((timestamp: string) => {
    // This is now handled internally by the consolidated timing system
  }, []);

  return {
    visualState: {
      currentItemStatuses: consolidatedTiming.state.currentItemStatuses,
      isPlaying: consolidatedTiming.state.isPlaying,
      currentSegmentId: consolidatedTiming.state.currentSegmentId,
      timeRemaining: consolidatedTiming.state.timeRemaining,
      playbackStartTime: consolidatedTiming.state.playbackStartTime,
      lastUpdate: consolidatedTiming.state.lastUpdate,
      controllerId: consolidatedTiming.state.controllerId
    },
    getItemVisualStatus,
    setItemVisualStatus,
    clearAllVisualStatuses,
    play: consolidatedTiming.play,
    pause: consolidatedTiming.pause,
    forward: consolidatedTiming.forward,
    backward: consolidatedTiming.backward,
    reset: consolidatedTiming.reset,
    jumpToSegment: consolidatedTiming.jumpToSegment,
    applyExternalVisualState: consolidatedTiming.applyExternalState,
    isPlaying: consolidatedTiming.isPlaying,
    currentSegmentId: consolidatedTiming.currentSegmentId,
    timeRemaining: consolidatedTiming.timeRemaining,
    isController: consolidatedTiming.isController,
    trackOwnUpdate,
    isInitialized: consolidatedTiming.isInitialized
  };
};
