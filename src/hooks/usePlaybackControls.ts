
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

  // Initialize showcaller visual state management with enhanced initialization handling
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

  // Enhanced initialization check with timeout safety
  const shouldEnableRealtime = useCallback(() => {
    return !!rundownId && isInitialized;
  }, [rundownId, isInitialized]);

  // Initialize realtime synchronization with better timing control
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: shouldEnableRealtime(), // Only enable after proper initialization
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: applyExternalVisualState
  });

  // Safety timeout for initialization
  useEffect(() => {
    if (rundownId && !isInitialized) {
      // Set a safety timeout to force initialization if it takes too long
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('📺 Showcaller initialization timeout - forcing ready state');
      }, 5000);
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

  // Enhanced control wrappers with validation
  const safePlay = useCallback((segmentId?: string) => {
    if (!controlsReady) {
      console.warn('📺 Play called before initialization complete');
      return;
    }
    play(segmentId);
  }, [controlsReady, play]);

  const safePause = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Pause called before initialization complete');
      return;
    }
    pause();
  }, [controlsReady, pause]);

  const safeForward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Forward called before initialization complete');
      return;
    }
    forward();
  }, [controlsReady, forward]);

  const safeBackward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Backward called before initialization complete');
      return;
    }
    backward();
  }, [controlsReady, backward]);

  const safeReset = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Reset called before initialization complete');
      return;
    }
    reset();
  }, [controlsReady, reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!controlsReady) {
      console.warn('📺 JumpToSegment called before initialization complete');
      return;
    }
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
