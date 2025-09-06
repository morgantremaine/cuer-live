
import { useCallback, useRef, useEffect } from 'react';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerBroadcastSync } from './useShowcallerBroadcastSync';
import { useCueIntegration } from './useCueIntegration';
import { ShowcallerBroadcastState } from '@/utils/showcallerBroadcast';
import { RundownItem } from '@/types/rundown';
import { isFloated } from '@/utils/rundownCalculations';

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
  const { broadcastState, broadcastTimingUpdate, isConnected: isBroadcastConnected } = useShowcallerBroadcastSync({
    rundownId,
    onBroadcastReceived: (state: ShowcallerBroadcastState) => {
      console.log('📺 Received showcaller broadcast in coordination:', state);

      // Handle timing updates differently - lightweight updates for countdown sync
      if (state.action === 'timing') {
        // Only apply timing if we're not the controller and currently playing the same segment
        if (!isController && isPlaying && currentSegmentId === state.currentSegmentId) {
          console.log('📺 Applying timing update:', state.timeRemaining);
          applyExternalVisualState({
            isPlaying: !!state.isPlaying,
            currentSegmentId: state.currentSegmentId || null,
            timeRemaining: state.timeRemaining ?? 0,
            isController: false,
            controllerId: state.userId,
            lastUpdate: new Date(state.timestamp).toISOString(),
            currentItemStatuses: visualState.currentItemStatuses
          });
        }
        return;
      }

      // Handle full state updates for navigation actions
      const targetSegmentId = state.action === 'jump' && state.jumpToSegmentId
        ? state.jumpToSegmentId
        : state.currentSegmentId;

      // Build a deterministic status map based on current items
      const buildStatusMap = (segmentId?: string) => {
        if (!segmentId) return undefined;
        const status: Record<string, string> = {};
        const selectedIndex = items.findIndex(item => item.id === segmentId);
        if (selectedIndex === -1) return undefined;
        items.forEach((item, index) => {
          if (item.type === 'regular') {
            if (index < selectedIndex) status[item.id] = 'completed';
            else if (index === selectedIndex) status[item.id] = 'current';
          }
        });
        return status;
      };

      const externalState = {
        isPlaying: !!state.isPlaying,
        currentSegmentId: targetSegmentId || null,
        timeRemaining: state.timeRemaining ?? 0,
        isController: !!state.isController,
        controllerId: state.userId,
        lastUpdate: new Date(state.timestamp).toISOString(),
        currentItemStatuses: buildStatusMap(targetSegmentId)
      };

      handleExternalVisualState(externalState);
    },
    enabled: isInitialized
  });

  // Only use broadcast system - no realtime fallback for showcaller
  const isProcessingVisualUpdate = false;
  const trackOwnVisualUpdate = trackOwnUpdate;

  // Helper to get current and next segments
  const getCurrentSegment = useCallback(() => {
    if (!currentSegmentId) return null;
    return items.find(item => item.id === currentSegmentId) || null;
  }, [items, currentSegmentId]);

  const getNextSegment = useCallback(() => {
    const curr = getCurrentSegment();
    if (!curr) return null;

    const currentIndex = items.findIndex(item => item.id === curr.id);
    for (let i = currentIndex + 1; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items, getCurrentSegment]);

  // Helper: previous non-floated regular item
  const getPrevSegment = useCallback(() => {
    const curr = getCurrentSegment();
    if (!curr) return null;
    const currentIndex = items.findIndex(item => item.id === curr.id);
    for (let i = currentIndex - 1; i >= 0; i--) {
      const item = items[i];
      if (item.type === 'regular' && !isFloated(item)) {
        return item;
      }
    }
    return null;
  }, [items, getCurrentSegment]);

  // Helper: parse duration to seconds
  const parseDurationToSeconds = useCallback((str: string | undefined) => {
    if (!str) return 0;
    const parts = str.split(':').map(n => Number(n) || 0);
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 1) return parts[0];
    return 0;
  }, []);

  const coordinatedPlay = useCallback((selectedSegmentId?: string) => {
    console.log('📺 Coordinated play called:', { selectedSegmentId, userId, isController });
    
    // Track this as our own update
    const timestamp = new Date().toISOString();
    trackOwnUpdate(timestamp);
    trackOwnVisualUpdate(timestamp);
    
    // Compute target and remaining before local state updates
    const targetId = selectedSegmentId || currentSegmentId || (items.find(it => it.type === 'regular' && !isFloated(it))?.id ?? null);
    const target = targetId ? items.find(it => it.id === targetId) : null;
    const targetRemaining = target ? parseDurationToSeconds(target.duration) : timeRemaining;

    play(selectedSegmentId);

    // Broadcast with computed target
    const broadcastPayload = {
      action: 'play' as const,
      isPlaying: true,
      currentSegmentId: targetId || null,
      timeRemaining: targetRemaining,
      isController
    };
    console.log('📺 About to broadcast play state:', broadcastPayload);
    broadcastState(broadcastPayload);
    console.log('📺 Broadcast sent for play action');
    
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
    
    // Compute next before local state updates
    const nextSeg = getNextSegment();
    const nextId = nextSeg?.id || currentSegmentId || null;
    const nextRemaining = nextSeg ? parseDurationToSeconds(nextSeg.duration) : timeRemaining;

    forward();

    // Broadcast with computed next
    const broadcastPayload = {
      action: 'forward' as const,
      isPlaying,
      currentSegmentId: nextId,
      timeRemaining: nextRemaining,
      isController
    };
    console.log('📺 About to broadcast forward state:', broadcastPayload);
    broadcastState(broadcastPayload);
    console.log('📺 Broadcast sent for forward action');
    
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
    
    // Compute previous before local state updates
    const prevSeg = getPrevSegment();
    const prevId = prevSeg?.id || currentSegmentId || null;
    const prevRemaining = prevSeg ? parseDurationToSeconds(prevSeg.duration) : timeRemaining;

    backward();
    
    // Broadcast with computed previous
    broadcastState({
      action: 'backward',
      isPlaying,
      currentSegmentId: prevId,
      timeRemaining: prevRemaining,
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
    
    // Compute current segment duration before local state updates
    const curr = getCurrentSegment();
    const resetId = curr?.id || currentSegmentId || null;
    const resetRemaining = curr ? parseDurationToSeconds(curr.duration) : 0;

    reset();
    
    // Broadcast with computed reset state
    broadcastState({
      action: 'reset',
      isPlaying: false,
      currentSegmentId: resetId,
      timeRemaining: resetRemaining,
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
    const seg = items.find(item => item.id === segmentId) || null;
    const segRemaining = seg ? parseDurationToSeconds(seg.duration) : 0;
    broadcastState({
      action: 'jump',
      jumpToSegmentId: segmentId,
      isPlaying,
      currentSegmentId: segmentId,
      timeRemaining: segRemaining,
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
    console.log('📺 Showcaller coordination connection status:', {
      isBroadcastConnected,
      rundownId,
      userId
    });
    
    if (isInitialized && !initializationRef.current) {
      initializationRef.current = true;
      console.log('📺 Showcaller state coordination initialized with broadcast-only sync:', {
        rundownId,
        userId,
        currentSegmentId,
        isPlaying,
        broadcastConnected: isBroadcastConnected
      });
    }
  }, [isInitialized, rundownId, userId, currentSegmentId, isPlaying, isBroadcastConnected]);

  // Enhanced timing broadcast for live synchronization
  useEffect(() => {
    if (!isController || !isPlaying || !currentSegmentId) return;

    const timingInterval = setInterval(() => {
      // Broadcast timing updates every 3 seconds during playback
      broadcastTimingUpdate(timeRemaining, currentSegmentId, isPlaying);
    }, 3000);

    return () => clearInterval(timingInterval);
  }, [isController, isPlaying, currentSegmentId, timeRemaining, broadcastTimingUpdate]);

  return {
    // State
    visualState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    isInitialized,
    isConnected: isBroadcastConnected,
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
