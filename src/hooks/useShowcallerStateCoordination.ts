
import { useCallback, useRef, useEffect } from 'react';
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
  const prevSegmentRef = useRef<string | null>(null);

  // Initialize cue integration
  const { sendCueTrigger } = useCueIntegration(
    rundownId,
    teamId,
    rundownTitle,
    rundownStartTime
  );

  // Use ONLY the simple sync system - removes the legacy complex system
  const simpleSync = useSimpleShowcallerSync({
    items,
    rundownId,
    userId,
    setShowcallerUpdate
  });

  // Helper to get current and next segments using simple sync state
  const getCurrentSegment = useCallback(() => {
    if (!simpleSync.currentSegmentId) return null;
    return items.find(item => item.id === simpleSync.currentSegmentId) || null;
  }, [items, simpleSync.currentSegmentId]);

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
    console.log('📺 Coordinated play called:', { selectedSegmentId, userId });
    
    // Use simple sync play function directly
    simpleSync.play(selectedSegmentId);
    
    // Send cue trigger for play event
    const current = selectedSegmentId ? items.find(item => item.id === selectedSegmentId) : getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying: true,
      timeRemaining: simpleSync.timeRemaining,
      playbackStartTime: Date.now(),
    });
  }, [simpleSync, userId, items, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedPause = useCallback(() => {
    console.log('📺 Coordinated pause called:', { userId });
    
    // Use simple sync pause function directly
    simpleSync.pause();
    
    // Send cue trigger for pause event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('playback_stop', current, next, {
      isPlaying: false,
      timeRemaining: simpleSync.timeRemaining,
    });
  }, [simpleSync, userId, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedForward = useCallback(() => {
    console.log('📺 Coordinated forward called:', { userId });
    
    // Use simple sync forward function directly
    simpleSync.forward();
    
    // Send cue trigger for forward event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying: simpleSync.isPlaying,
      timeRemaining: simpleSync.timeRemaining,
    });
  }, [simpleSync, userId, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedBackward = useCallback(() => {
    console.log('📺 Coordinated backward called:', { userId });
    
    // Use simple sync backward function directly
    simpleSync.backward();
    
    // Send cue trigger for backward event
    const current = getCurrentSegment();
    const next = getNextSegment();
    sendCueTrigger('cue_advance', current, next, {
      isPlaying: simpleSync.isPlaying,
      timeRemaining: simpleSync.timeRemaining,
    });
  }, [simpleSync, userId, getCurrentSegment, getNextSegment, sendCueTrigger]);

  const coordinatedReset = useCallback(() => {
    console.log('📺 Coordinated reset called:', { userId });
    
    // Use simple sync reset function directly
    simpleSync.reset();
    
    // Send cue trigger for reset event
    const current = items[0] || null;
    const next = items[1] || null;
    sendCueTrigger('playback_reset', current, next, {
      isPlaying: false,
      timeRemaining: 0,
    });
  }, [simpleSync, userId, items, sendCueTrigger]);

  const coordinatedJumpToSegment = useCallback((segmentId: string) => {
    console.log('📺 Coordinated jump to segment called:', { segmentId, userId });
    
    // Use simple sync jumpToSegment function directly
    simpleSync.jumpToSegment(segmentId);
    
    // Send cue trigger for jump event
    const current = items.find(item => item.id === segmentId) || null;
    const currentIndex = current ? items.findIndex(item => item.id === segmentId) : -1;
    const next = currentIndex !== -1 && currentIndex < items.length - 1 ? items[currentIndex + 1] : null;
    sendCueTrigger('cue_jump', current, next, {
      isPlaying: simpleSync.isPlaying,
      timeRemaining: simpleSync.timeRemaining,
    });
  }, [simpleSync, userId, items, sendCueTrigger]);

  // Initialization coordination - simplified
  useEffect(() => {
    if (!initializationRef.current && simpleSync.isConnected) {
      initializationRef.current = true;
      console.log('📺 Showcaller state coordination initialized with simple sync:', {
        rundownId,
        userId,
        currentSegmentId: simpleSync.currentSegmentId,
        isPlaying: simpleSync.isPlaying,
        isConnected: simpleSync.isConnected
      });
    }
  }, [simpleSync.isConnected, rundownId, userId, simpleSync.currentSegmentId, simpleSync.isPlaying]);

  return {
    // State - use simple sync only
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
    
    // Coordinated controls with cue integration
    play: coordinatedPlay,
    pause: coordinatedPause,
    forward: coordinatedForward,
    backward: coordinatedBackward,
    reset: coordinatedReset,
    jumpToSegment: coordinatedJumpToSegment,
    
    // Tracking - simplified
    trackOwnUpdate: () => {},
    trackOwnVisualUpdate: () => {}
  };
};
