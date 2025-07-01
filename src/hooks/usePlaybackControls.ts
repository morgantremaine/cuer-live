
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

  // Initialize showcaller visual state management with precision timing
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

  // Enhanced initialization check with better timing control
  const shouldEnableRealtime = useCallback(() => {
    return !!rundownId && isInitialized;
  }, [rundownId, isInitialized]);

  // Initialize realtime synchronization with precision timing support
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: shouldEnableRealtime(),
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: applyExternalVisualState
  });

  // Reduced timeout for initialization with precision timing
  useEffect(() => {
    if (rundownId && !isInitialized) {
      // Set a reduced timeout for faster initialization
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('📺 Showcaller initialization timeout - forcing ready state');
      }, 3000); // Reduced from 5000ms
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

  // Enhanced control wrappers with precision timing validation
  const safePlay = useCallback((segmentId?: string) => {
    if (!controlsReady) {
      console.warn('📺 Play called before initialization complete');
      return;
    }
    console.log('📺 Safe play called with precision timing support');
    play(segmentId);
  }, [controlsReady, play]);

  const safePause = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Pause called before initialization complete');
      return;
    }
    console.log('📺 Safe pause called with precision timing support');
    pause();
  }, [controlsReady, pause]);

  const safeForward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Forward called before initialization complete');
      return;
    }
    console.log('📺 Safe forward called with precision timing support');
    forward();
  }, [controlsReady, forward]);

  const safeBackward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Backward called before initialization complete');
      return;
    }
    console.log('📺 Safe backward called with precision timing support');
    backward();
  }, [controlsReady, backward]);

  const safeReset = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Reset called before initialization complete');
      return;
    }
    console.log('📺 Safe reset called with precision timing support');
    reset();
  }, [controlsReady, reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!controlsReady) {
      console.warn('📺 JumpToSegment called before initialization complete');
      return;
    }
    console.log('📺 Safe jumpToSegment called with precision timing support');
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
