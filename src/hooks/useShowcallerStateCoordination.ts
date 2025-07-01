
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
  const lastSyncTimestampRef = useRef<string | null>(null);

  // Use simplified visual state with master timing
  const showcallerState = useShowcallerVisualState({
    items,
    rundownId,
    userId
  });

  // Enhanced external state handler
  const handleExternalVisualState = useCallback((externalState: any) => {
    if (!showcallerState.isInitialized) {
      console.log('📺 Deferring external state - not initialized');
      return;
    }

    if (externalState.lastUpdate === lastSyncTimestampRef.current) {
      return;
    }

    lastSyncTimestampRef.current = externalState.lastUpdate;
    
    console.log('📺 Coordinating external state with master timing:', {
      fromController: externalState.controllerId,
      currentController: showcallerState.visualState.controllerId,
      timestamp: externalState.lastUpdate
    });

    showcallerState.applyExternalVisualState(externalState);
  }, [showcallerState]);

  // Realtime synchronization
  const { isConnected, trackOwnVisualUpdate } = useShowcallerRealtimeSync({
    rundownId,
    onExternalVisualStateReceived: handleExternalVisualState,
    enabled: showcallerState.isInitialized
  });

  // Coordinated control functions with master timing
  const coordinatedPlay = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Coordinated play with master timing:', { selectedSegmentId, userId });
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.play(selectedSegmentId);
  }, [showcallerState, userId, trackOwnVisualUpdate]);

  const coordinatedPause = useCallback(() => {
    console.log('📺 Coordinated pause with master timing');
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.pause();
  }, [showcallerState, trackOwnVisualUpdate]);

  const coordinatedForward = useCallback(() => {
    console.log('📺 Coordinated forward with master timing');
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.forward();
  }, [showcallerState, trackOwnVisualUpdate]);

  const coordinatedBackward = useCallback(() => {
    console.log('📺 Coordinated backward with master timing');
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.backward();
  }, [showcallerState, trackOwnVisualUpdate]);

  const coordinatedReset = useCallback(() => {
    console.log('📺 Coordinated reset with master timing');
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.reset();
  }, [showcallerState, trackOwnVisualUpdate]);

  const coordinatedJumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Coordinated jump with master timing:', segmentId);
    
    const timestamp = new Date().toISOString();
    showcallerState.trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    showcallerState.jumpToSegment(segmentId);
  }, [showcallerState, trackOwnVisualUpdate]);

  // Initialization coordination
  useEffect(() => {
    if (showcallerState.isInitialized && !initializationRef.current) {
      initializationRef.current = true;
      console.log('📺 Master timing coordination initialized:', {
        rundownId,
        userId,
        isConnected
      });
    }
  }, [showcallerState.isInitialized, rundownId, userId, isConnected]);

  return {
    // State from master timing
    visualState: showcallerState.visualState,
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining, // From master timing
    isController: showcallerState.isController,
    isInitialized: showcallerState.isInitialized,
    isConnected,
    
    // Visual state management
    getItemVisualStatus: showcallerState.getItemVisualStatus,
    setItemVisualStatus: showcallerState.setItemVisualStatus,
    clearAllVisualStatuses: showcallerState.clearAllVisualStatuses,
    
    // Coordinated controls with master timing
    play: coordinatedPlay,
    pause: coordinatedPause,
    forward: coordinatedForward,
    backward: coordinatedBackward,
    reset: coordinatedReset,
    jumpToSegment: coordinatedJumpToSegment,
    
    // Tracking
    trackOwnUpdate: showcallerState.trackOwnUpdate,
    trackOwnVisualUpdate
  };
};
