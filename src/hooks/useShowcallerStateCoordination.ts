
import { useCallback, useRef, useEffect } from 'react';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useShowcallerBroadcastSync } from './useShowcallerBroadcastSync';
import { useCueIntegration } from './useCueIntegration';
import { useSimpleShowcallerSync } from './useSimpleShowcallerSync';
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
  setShowcallerUpdate?: (isUpdate: boolean) => void;
}

export const useShowcallerStateCoordination = ({ 
  items, 
  rundownId, 
  userId,
  teamId,
  rundownTitle = '',
  rundownStartTime,
  setShowcallerUpdate
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
    isInitialized,
    getPreciseTime // Add getPreciseTime from visual state
  } = useShowcallerVisualState({
    items,
    rundownId,
    userId
  });

  // Enhanced external state handler with suppression window
  const suppressionWindowRef = useRef<Map<string, number>>(new Map());
  const prevSegmentRef = useRef<string | null>(null);
  const lastManualActionRef = useRef<number>(0);
  
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

  // Use simple sync instead of complex coordination
  const simpleSync = useSimpleShowcallerSync({
    items,
    rundownId,
    userId,
    setShowcallerUpdate
  });

  // Broadcast-first real-time sync (DISABLED to prevent duplicate broadcasts)
  const { broadcastState, broadcastTimingUpdate, isConnected: isBroadcastConnected } = useShowcallerBroadcastSync({
    rundownId,
    onBroadcastReceived: () => {}, // Handled by simpleSync
    enabled: false // DISABLED - simpleSync handles all broadcasting
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
    lastManualActionRef.current = Date.now();
    
    // Compute target and remaining before local state updates
    const targetId = selectedSegmentId || currentSegmentId || (items.find(it => it.type === 'regular' && !isFloated(it))?.id ?? null);
    const target = targetId ? items.find(it => it.id === targetId) : null;
    const targetRemaining = target ? parseDurationToSeconds(target.duration) : timeRemaining;

    play(selectedSegmentId);

    // Broadcast with computed target and precise timing
    const broadcastPayload = {
      action: 'play' as const,
      isPlaying: true,
      currentSegmentId: targetId || null,
      timeRemaining: targetRemaining,
      playbackStartTime: getPreciseTime(), // Include precise timing base
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
    
    // Broadcast first for instant sync with precise timing
    broadcastState({
      action: 'pause',
      isPlaying: false,
      currentSegmentId,
      timeRemaining,
      playbackStartTime: null, // No playback when paused
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
    lastManualActionRef.current = Date.now();
    
    // Compute next before local state updates
    const nextSeg = getNextSegment();
    const nextId = nextSeg?.id || currentSegmentId || null;
    const nextRemaining = nextSeg ? parseDurationToSeconds(nextSeg.duration) : timeRemaining;

    forward();

    // Broadcast with computed next and precise timing
    const broadcastPayload = {
      action: 'forward' as const,
      isPlaying,
      currentSegmentId: nextId,
      timeRemaining: nextRemaining,
      playbackStartTime: isPlaying ? getPreciseTime() : null, // Include timing base if playing
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
    lastManualActionRef.current = Date.now();
    
    // Compute previous before local state updates
    const prevSeg = getPrevSegment();
    const prevId = prevSeg?.id || currentSegmentId || null;
    const prevRemaining = prevSeg ? parseDurationToSeconds(prevSeg.duration) : timeRemaining;

    backward();
    
    // Broadcast with computed previous and precise timing
    broadcastState({
      action: 'backward',
      isPlaying,
      currentSegmentId: prevId,
      timeRemaining: prevRemaining,
      playbackStartTime: isPlaying ? getPreciseTime() : null, // Include timing base if playing
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
    lastManualActionRef.current = Date.now();
    
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
      playbackStartTime: null, // No playback when reset
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
    lastManualActionRef.current = Date.now();
    
    jumpToSegment(segmentId);
    
    // Broadcast first for instant sync with precise timing
    const seg = items.find(item => item.id === segmentId) || null;
    const segRemaining = seg ? parseDurationToSeconds(seg.duration) : 0;
    broadcastState({
      action: 'jump',
      jumpToSegmentId: segmentId,
      isPlaying,
      currentSegmentId: segmentId,
      timeRemaining: segRemaining,
      playbackStartTime: isPlaying ? getPreciseTime() : null, // Include timing base if playing
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

  // Enhanced timing broadcast for live synchronization using setInterval with ref pattern
  const timingStateRef = useRef({ timeRemaining, currentSegmentId, isPlaying, playbackStartTime: visualState.playbackStartTime });
  const timingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // Update ref with current values including playbackStartTime
  timingStateRef.current = { timeRemaining, currentSegmentId, isPlaying, playbackStartTime: visualState.playbackStartTime };

  useEffect(() => {
    // Clear any existing interval
    if (timingIntervalRef.current) {
      clearInterval(timingIntervalRef.current);
      timingIntervalRef.current = null;
    }

    if (!isController || !isPlaying || !currentSegmentId) return;

    console.log('📺 Starting timing broadcast interval for controller');
    
    timingIntervalRef.current = setInterval(() => {
      const state = timingStateRef.current;
      if (state.isPlaying && state.currentSegmentId) {
        console.log('📺 Broadcasting timing sync:', state.timeRemaining, 'for segment:', state.currentSegmentId);
        broadcastTimingUpdate(state.timeRemaining, state.currentSegmentId, state.isPlaying, state.playbackStartTime);
      }
    }, 2000);

    return () => {
      console.log('📺 Clearing timing broadcast interval');
      if (timingIntervalRef.current) {
        clearInterval(timingIntervalRef.current);
        timingIntervalRef.current = null;
      }
    };
  }, [isController, isPlaying, currentSegmentId, broadcastTimingUpdate, visualState.playbackStartTime]); // Include playback start time in deps

  // Auto-broadcast on controller auto-advance (when segment changes without a manual action)
  useEffect(() => {
    const prev = prevSegmentRef.current;
    const curr = currentSegmentId || null;

    if (!isController) {
      prevSegmentRef.current = curr;
      return;
    }

    if (prev && curr && prev !== curr) {
      const recentlyManual = Date.now() - lastManualActionRef.current < 800;
      if (!recentlyManual) {
        const seg = items.find(item => item.id === curr) || null;
        const segRemaining = seg ? parseDurationToSeconds(seg.duration) : 0;
        broadcastState({
          action: 'forward',
          isPlaying,
          currentSegmentId: curr,
          timeRemaining: segRemaining,
          isController
        });
      }
    }

    prevSegmentRef.current = curr;
  }, [currentSegmentId, isController, isPlaying, items, broadcastState, parseDurationToSeconds]);

  return {
    // State - use simple sync
    isPlaying: simpleSync.isPlaying,
    currentSegmentId: simpleSync.currentSegmentId,
    timeRemaining: simpleSync.timeRemaining,
    isController: simpleSync.isController,
    isInitialized: true, // Always initialized with simple sync
    isConnected: simpleSync.isConnected,
    hasLoadedInitialState: true,
    
    // Visual state management - use simple sync
    getItemVisualStatus: simpleSync.getItemVisualStatus,
    setItemVisualStatus: () => {}, // Not needed with simple sync
    clearAllVisualStatuses: () => {}, // Not needed with simple sync
    
    // Coordinated controls - use simple sync
    play: simpleSync.play,
    pause: simpleSync.pause,
    forward: simpleSync.forward,
    backward: simpleSync.backward,
    reset: simpleSync.reset,
    jumpToSegment: simpleSync.jumpToSegment,
    
    // Tracking - simplified
    trackOwnUpdate: () => {},
    trackOwnVisualUpdate: () => {}
  };
};
