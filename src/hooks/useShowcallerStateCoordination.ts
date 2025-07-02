
import { useCallback, useRef, useEffect } from 'react';
import { useShowcallerVisualState } from './useShowcallerVisualState';
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
  const initializationRef = useRef<boolean>(false);
  const lastProcessedTimestampRef = useRef<string | null>(null);

  // Visual state management with precision timing
  const {
    visualState,
    getItemVisualStatus,
    setItemVisualStatus,
    clearAllVisualStatuses,
    play,
    pause,
    forward,
    backward,
    reset,
    jumpToSegment,
    applyExternalVisualState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    trackOwnUpdate,
    isInitialized
  } = useShowcallerVisualState({
    items,
    rundownId,
    userId
  });

  // Enhanced external state handler with better logic
  const handleExternalVisualState = useCallback((externalState: any) => {
    console.log('📺 handleExternalVisualState called with:', {
      hasLastUpdate: !!externalState.lastUpdate,
      lastUpdate: externalState.lastUpdate,
      lastProcessed: lastProcessedTimestampRef.current,
      fromController: externalState.controllerId,
      currentUserId: userId,
      isInitialized
    });

    // Skip if we haven't initialized yet to prevent conflicts
    if (!isInitialized) {
      console.log('📺 Deferring external state - not initialized yet');
      return;
    }

    // Only skip if this is the exact same timestamp we just processed
    if (externalState.lastUpdate && externalState.lastUpdate === lastProcessedTimestampRef.current) {
      console.log('📺 Skipping - exact same timestamp as last processed');
      return;
    }

    // Allow the update through if it has a valid timestamp
    if (externalState.lastUpdate) {
      lastProcessedTimestampRef.current = externalState.lastUpdate;
      
      console.log('📺 Coordinating external showcaller state:', {
        fromController: externalState.controllerId,
        currentController: visualState.controllerId,
        isCurrentlyController: isController,
        timestamp: externalState.lastUpdate
      });

      // Apply the external state
      applyExternalVisualState(externalState);
    } else {
      console.log('📺 Skipping external state - no timestamp');
    }
  }, [isInitialized, applyExternalVisualState, visualState.controllerId, isController, userId]);

  // Realtime synchronization with processing state
  const { isConnected, isProcessingVisualUpdate, trackOwnVisualUpdate } = useShowcallerRealtimeSync({
    rundownId,
    onExternalVisualStateReceived: handleExternalVisualState,
    enabled: isInitialized
  });

  // Enhanced control functions with better coordination
  const coordinatedPlay = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Coordinated play called:', { selectedSegmentId, userId, isController });
    
    // Track this as our own update
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    play(selectedSegmentId);
  }, [play, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  const coordinatedPause = useCallback(() => {
    console.log('📺 Coordinated pause called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    pause();
  }, [pause, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  const coordinatedForward = useCallback(() => {
    console.log('📺 Coordinated forward called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    forward();
  }, [forward, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  const coordinatedBackward = useCallback(() => {
    console.log('📺 Coordinated backward called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    backward();
  }, [backward, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  const coordinatedReset = useCallback(() => {
    console.log('📺 Coordinated reset called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    reset();
  }, [reset, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  const coordinatedJumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Coordinated jump to segment called:', { segmentId, userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    jumpToSegment(segmentId);
  }, [jumpToSegment, userId, isController, trackOwnUpdate, trackOwnVisualUpdate]);

  // Initialization coordination
  useEffect(() => {
    if (isInitialized && !initializationRef.current) {
      initializationRef.current = true;
      console.log('📺 Showcaller state coordination initialized:', {
        rundownId,
        userId,
        currentSegmentId,
        isPlaying,
        isConnected
      });
    }
  }, [isInitialized, rundownId, userId, currentSegmentId, isPlaying, isConnected]);

  return {
    // State
    visualState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    isInitialized,
    isConnected,
    isProcessingVisualUpdate,
    
    // Visual state management
    getItemVisualStatus,
    setItemVisualStatus,
    clearAllVisualStatuses,
    
    // Coordinated controls
    play: coordinatedPlay,
    pause: coordinatedPause,
    forward: coordinatedForward,
    backward: coordinatedBackward,
    reset: coordinatedReset,
    jumpToSegment: coordinatedJumpToSegment,
    
    // Tracking
    trackOwnUpdate,
    trackOwnVisualUpdate
  };
};
