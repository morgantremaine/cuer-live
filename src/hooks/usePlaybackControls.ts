import { useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerVisualState } from './useShowcallerVisualState';
import { useRealtimeRundown } from './useRealtimeRundown';
import { useAuth } from './useAuth';

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void,
  rundownId?: string,
  onShowcallerActivity?: (active: boolean) => void,
  setShowcallerUpdate?: (isUpdate: boolean) => void,
  currentContentHash?: string,
  isEditing?: boolean,
  hasUnsavedChanges?: boolean,
  isProcessingRealtimeUpdate?: boolean
) => {
  const { user } = useAuth();
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize showcaller visual state management with enhanced precision timing
  const {
    visualState,
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
    userId: user?.id
  });

  // Enhanced initialization check with immediate readiness
  const shouldEnableRealtime = useCallback(() => {
    return !!rundownId && isInitialized;
  }, [rundownId, isInitialized]);

  // Initialize realtime synchronization with enhanced precision timing support
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: shouldEnableRealtime(),
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: applyExternalVisualState
  });

  // Standard initialization timeout - mobile detection was causing issues
  useEffect(() => {
    if (rundownId && !isInitialized) {
      // Standard timeout for all devices
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('📺 Enhanced showcaller initialization timeout - forcing ready state');
      }, 3000);
    } else if (isInitialized && initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId, isInitialized]);

  // Only expose controls after proper initialization
  const controlsReady = isInitialized;

  // Enhanced control wrappers with immediate precision timing validation
  const safePlay = useCallback((segmentId?: string) => {
    if (!controlsReady) {
      console.warn('📺 Play called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe play called with immediate precision timing');
    play(segmentId);
  }, [controlsReady, play]);

  const safePause = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Pause called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe pause called with precision timing');
    pause();
  }, [controlsReady, pause]);

  const safeForward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Forward called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe forward called with precision timing');
    forward();
  }, [controlsReady, forward]);

  const safeBackward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Backward called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe backward called with precision timing');
    backward();
  }, [controlsReady, backward]);

  const safeReset = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Reset called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe reset called with precision timing');
    reset();
  }, [controlsReady, reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!controlsReady) {
      console.warn('📺 JumpToSegment called before initialization complete');
      return;
    }
    console.log('📺 Enhanced safe jumpToSegment called with immediate precision timing');
    jumpToSegment(segmentId);
  }, [controlsReady, jumpToSegment]);

  return {
    isPlaying: controlsReady ? isPlaying : false,
    currentSegmentId: controlsReady ? currentSegmentId : null,
    timeRemaining: controlsReady ? timeRemaining : 0,
    play: safePlay,
    pause: safePause,
    forward: safeForward,
    backward: safeBackward,
    reset: safeReset,
    jumpToSegment: safeJumpToSegment,
    isController: controlsReady ? isController : false,
    isInitialized,
    isConnected
  };
};
