
import { useCallback, useRef, useEffect } from 'react';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerRealtimeSync } from './useShowcallerRealtimeSync';
import { useShowcallerBroadcastSync } from './useShowcallerBroadcastSync';
import { useCueIntegration } from './useCueIntegration';
import { ShowcallerBroadcastState } from '@/utils/showcallerBroadcast';
import { RundownItem } from '@/types/rundown';

interface UseShowcallerStateCoordinationProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
  teamId?: string | null;
  rundownTitle?: string;
  rundownStartTime?: string;
}

export const useShowcallerStateCoordination = ({ 
  items, 
  rundownId, 
  userId,
  teamId,
  rundownTitle = '',
  rundownStartTime
}: UseShowcallerStateCoordinationProps) => {
  const initializationRef = useRef<boolean>(false);
  const lastProcessedTimestampRef = useRef<string | null>(null);

  // Initialize cue integration
  const { sendCueTrigger } = useCueIntegration(
    rundownId,
    teamId,
    rundownTitle,
    rundownStartTime
  );

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

  // Enhanced external state handler with suppression window
  const suppressionWindowRef = useRef<Map<string, number>>(new Map());
  
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

    // Skip if this is our own update (enhanced detection)
    if (externalState.controllerId === userId) {
      console.log('⏭️ Skipping own showcaller update');
      return;
    }

    // Suppression window: prevent processing duplicate external states within 1 second
    const stateKey = externalState.lastUpdate || 'no-timestamp';
    const now = Date.now();
    const lastProcessed = suppressionWindowRef.current.get(stateKey);
    
    if (lastProcessed && (now - lastProcessed) < 1000) {
      console.log('📺 Suppression window: skipping duplicate external state');
      return;
    }

    // Only skip if this is the exact same timestamp we just processed
    if (externalState.lastUpdate && externalState.lastUpdate === lastProcessedTimestampRef.current) {
      console.log('📺 Skipping - exact same timestamp as last processed');
      return;
    }

    // Apply the external state with suppression tracking
    if (externalState.lastUpdate) {
      lastProcessedTimestampRef.current = externalState.lastUpdate;
      suppressionWindowRef.current.set(stateKey, now);
      
      console.log('📺 Coordinating external showcaller state:', {
        fromController: externalState.controllerId,
        currentController: visualState.controllerId,
        isCurrentlyController: isController,
        timestamp: externalState.lastUpdate
      });

      // Apply the external state
      console.log('📺 Applying external visual state from controller:', externalState.controllerId);
      applyExternalVisualState(externalState);
      
      // Cleanup old suppression entries (older than 5 seconds)
      setTimeout(() => {
        suppressionWindowRef.current.delete(stateKey);
      }, 5000);
    } else {
      console.log('📺 Skipping external state - no timestamp');
    }
  }, [isInitialized, applyExternalVisualState, visualState.controllerId, isController, userId]);

  // Broadcast-first real-time sync
  const { broadcastState, isConnected: isBroadcastConnected } = useShowcallerBroadcastSync({
    rundownId,
    onBroadcastReceived: (state: ShowcallerBroadcastState) => {
      console.log('📺 Received showcaller broadcast in coordination:', state);
      
      // Apply broadcast state to visual state
      if (state.action === 'play' && state.isPlaying !== undefined) {
        applyExternalVisualState({ 
          isPlaying: state.isPlaying,
          currentSegmentId: state.currentSegmentId,
          timeRemaining: state.timeRemaining,
          isController: state.isController
        });
      } else if (state.action === 'pause') {
        applyExternalVisualState({ 
          isPlaying: false,
          currentSegmentId: state.currentSegmentId,
          timeRemaining: state.timeRemaining,
          isController: state.isController
        });
      } else if (state.action === 'jump' && state.jumpToSegmentId) {
        applyExternalVisualState({ 
          currentSegmentId: state.jumpToSegmentId,
          isPlaying: state.isPlaying,
          timeRemaining: state.timeRemaining,
          isController: state.isController
        });
      } else if (state.action === 'forward' || state.action === 'backward' || state.action === 'reset') {
        applyExternalVisualState({ 
          isPlaying: state.isPlaying,
          currentSegmentId: state.currentSegmentId,
          timeRemaining: state.timeRemaining,
          isController: state.isController
        });
      } else {
        // Generic state update
        applyExternalVisualState({ 
          isPlaying: state.isPlaying,
          currentSegmentId: state.currentSegmentId,
          timeRemaining: state.timeRemaining,
          isController: state.isController
        });
      }
    },
    enabled: isInitialized
  });

  // Fallback real-time synchronization (for new viewers and persistence)
  const { 
    isConnected: isFallbackConnected, 
    isProcessingVisualUpdate, 
    trackOwnVisualUpdate 
  } = useShowcallerRealtimeSync({
    rundownId,
    onExternalVisualStateReceived: handleExternalVisualState,
    enabled: isInitialized
  });

  // Helper to get current and next segments
  const getCurrentSegment = useCallback(() => {
    if (!currentSegmentId) return null;
    return items.find(item => item.id === currentSegmentId) || null;
  }, [items, currentSegmentId]);

  const getNextSegment = useCallback(() => {
    const current = getCurrentSegment();
    if (!current) return null;
    
    const currentIndex = items.findIndex(item => item.id === current.id);
    if (currentIndex === -1 || currentIndex === items.length - 1) return null;
    
    return items[currentIndex + 1] || null;
  }, [items, getCurrentSegment]);

  // Enhanced control functions with broadcast-first coordination and cue triggers
  const coordinatedPlay = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Coordinated play called:', { selectedSegmentId, userId, isController });
    
    // Track this as our own update
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    play(selectedSegmentId);
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'play',
      isPlaying: true,
      currentSegmentId: selectedSegmentId || currentSegmentId,
      timeRemaining,
      isController
    });
    
    // Send cue trigger for play event
    const current = selectedSegmentId ? items.find(item => item.id === selectedSegmentId) : getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying: true,
      timeRemaining,
      playbackStartTime: Date.now(),
    });
  }, [play, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, currentSegmentId, timeRemaining, items, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedPause = useCallback(() => {
    console.log('📺 Coordinated pause called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    pause();
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'pause',
      isPlaying: false,
      currentSegmentId,
      timeRemaining,
      isController
    });
    
    // Send cue trigger for pause event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('playback_stop', current, next, {
      isPlaying: false,
      timeRemaining,
    });
  }, [pause, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, currentSegmentId, timeRemaining, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedForward = useCallback(() => {
    console.log('📺 Coordinated forward called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    forward();
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'forward',
      isPlaying,
      currentSegmentId,
      timeRemaining,
      isController
    });
    
    // Send cue trigger for forward event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying,
      timeRemaining,
    });
  }, [forward, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, isPlaying, currentSegmentId, timeRemaining, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedBackward = useCallback(() => {
    console.log('📺 Coordinated backward called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    backward();
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'backward',
      isPlaying,
      currentSegmentId,
      timeRemaining,
      isController
    });
    
    // Send cue trigger for backward event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying,
      timeRemaining,
    });
  }, [backward, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, isPlaying, currentSegmentId, timeRemaining, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedReset = useCallback(() => {
    console.log('📺 Coordinated reset called:', { userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    reset();
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'reset',
      isPlaying: false,
      currentSegmentId,
      timeRemaining: 0,
      isController
    });
    
    // Send cue trigger for reset event
    const current = items[0] || null;
    const next = items[1] || null;
    sendCueTrigger('playback_reset', current, next, {
      isPlaying: false,
      timeRemaining: 0,
    });
  }, [reset, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, currentSegmentId, isController, items, sendCueTrigger]);

  const coordinatedJumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Coordinated jump to segment called:', { segmentId, userId, isController });
    
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    jumpToSegment(segmentId);
    
    // Broadcast first for instant sync
    broadcastState({
      action: 'jump',
      jumpToSegmentId: segmentId,
      isPlaying,
      currentSegmentId: segmentId,
      timeRemaining,
      isController
    });
    
    // Send cue trigger for jump event
    const current = items.find(item => item.id === segmentId) || null;
    const currentIndex = current ? items.findIndex(item => item.id === segmentId) : -1;
    const next = currentIndex !== -1 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
    sendCueTrigger('cue_jump', current, next, {
      isPlaying,
      timeRemaining,
    });
  }, [jumpToSegment, broadcastState, userId, isController, trackOwnUpdate, trackOwnVisualUpdate, isPlaying, timeRemaining, items, sendCueTrigger]);

  // Initialization coordination
  useEffect(() => {
    const isFullyConnected = isBroadcastConnected && isFallbackConnected;
    if (isInitialized && !initializationRef.current) {
      initializationRef.current = true;
      console.log('📺 Showcaller state coordination initialized with broadcast-first sync:', {
        rundownId,
        userId,
        currentSegmentId,
        isPlaying,
        broadcastConnected: isBroadcastConnected,
        fallbackConnected: isFallbackConnected
      });
    }
  }, [isInitialized, rundownId, userId, currentSegmentId, isPlaying, isBroadcastConnected, isFallbackConnected]);

  return {
    // State
    visualState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    isInitialized,
    isConnected: isBroadcastConnected && isFallbackConnected,
    isProcessingVisualUpdate,
    hasLoadedInitialState: isInitialized, // Add this to track when visual indicators are ready
    
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
