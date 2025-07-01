
import { useShowcallerUnifiedTiming } from './useShowcallerUnifiedTiming';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerStateCoordinationProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
}

export const useShowcallerStateCoordination = ({
  items,
  rundownId,
  userId
}: UseShowcallerStateCoordinationProps) => {
  // Get rundown start time from items (this should be passed from parent ideally)
  const rundownStartTime = '09:00:00'; // Default - should be configurable

  // Use the new unified timing system
  const unifiedTiming = useShowcallerUnifiedTiming({
    items,
    rundownId,
    rundownStartTime,
    userId,
    onSaveState: async (state) => {
      // Save to database if needed
      console.log('📺 Saving unified state:', state);
    }
  });

  // Realtime sync for coordinated state
  const realtimeSync = useShowcallerRealtimeSync({
    rundownId,
    onExternalVisualStateReceived: unifiedTiming.applyExternalState,
    enabled: !!rundownId
  });

  return {
    // Core state
    isPlaying: unifiedTiming.isPlaying,
    currentSegmentId: unifiedTiming.currentSegmentId,
    timeRemaining: unifiedTiming.timeRemaining,
    isController: unifiedTiming.isController,
    isInitialized: unifiedTiming.isInitialized,
    isConnected: realtimeSync.isConnected,
    
    // Timing status for over/under display
    timingStatus: unifiedTiming.timingStatus,
    
    // Controls
    play: unifiedTiming.play,
    pause: unifiedTiming.pause,
    forward: unifiedTiming.forward,
    backward: unifiedTiming.backward,
    reset: unifiedTiming.reset,
    jumpToSegment: unifiedTiming.jumpToSegment,
    
    // Visual state for row coloring
    getItemVisualStatus: unifiedTiming.getItemStatus
  };
};
