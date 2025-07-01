
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
  console.log('📺 Legacy useShowcallerVisualState - redirecting to consolidated timing');

  // Use the consolidated timing system
  const consolidatedTiming = useShowcallerConsolidatedTiming({
    items,
    rundownId,
    userId
  });

  // Legacy compatibility functions
  const getItemVisualStatus = useCallback((itemId: string) => {
    return consolidatedTiming.getItemStatus(itemId);
  }, [consolidatedTiming.getItemStatus]);

  const setItemVisualStatus = useCallback((itemId: string, status: string) => {
    console.log('📺 Legacy setItemVisualStatus called - this is now handled by consolidated timing');
    // This is now handled internally by the consolidated timing system
  }, []);

  const clearAllVisualStatuses = useCallback(() => {
    console.log('📺 Legacy clearAllVisualStatuses called - this is now handled by consolidated timing');
    // This is now handled internally by the consolidated timing system
  }, []);

  const trackOwnUpdate = useCallback((timestamp: string) => {
    console.log('📺 Legacy trackOwnUpdate called:', timestamp);
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
