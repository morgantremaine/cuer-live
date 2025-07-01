
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

  // Use simplified showcaller visual state with master timing
  const showcallerState = useShowcallerVisualState({
    items,
    rundownId,
    userId: user?.id
  });

  // Simplified initialization check
  const shouldEnableRealtime = useCallback(() => {
    return !!rundownId && showcallerState.isInitialized;
  }, [rundownId, showcallerState.isInitialized]);

  // Initialize realtime synchronization
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {},
    enabled: shouldEnableRealtime(),
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate: showcallerState.trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: showcallerState.applyExternalVisualState
  });

  // Simplified initialization timeout
  useEffect(() => {
    if (rundownId && !showcallerState.isInitialized) {
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('📺 Showcaller initialization timeout');
      }, 3000);
    } else if (showcallerState.isInitialized && initializationTimeoutRef.current) {
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId, showcallerState.isInitialized]);

  // Control wrappers - simplified and safe
  const safePlay = useCallback((segmentId?: string) => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 Play called before initialization');
      return;
    }
    console.log('📺 Safe play with master timing');
    showcallerState.play(segmentId);
  }, [showcallerState]);

  const safePause = useCallback(() => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 Pause called before initialization');
      return;
    }
    showcallerState.pause();
  }, [showcallerState]);

  const safeForward = useCallback(() => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 Forward called before initialization');
      return;
    }
    showcallerState.forward();
  }, [showcallerState]);

  const safeBackward = useCallback(() => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 Backward called before initialization');
      return;
    }
    showcallerState.backward();
  }, [showcallerState]);

  const safeReset = useCallback(() => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 Reset called before initialization');
      return;
    }
    showcallerState.reset();
  }, [showcallerState]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!showcallerState.isInitialized) {
      console.warn('📺 JumpToSegment called before initialization');
      return;
    }
    showcallerState.jumpToSegment(segmentId);
  }, [showcallerState]);

  return {
    isPlaying: showcallerState.isPlaying,
    currentSegmentId: showcallerState.currentSegmentId,
    timeRemaining: showcallerState.timeRemaining, // From master timing
    play: safePlay,
    pause: safePause,
    forward: safeForward,
    backward: safeBackward,
    reset: safeReset,
    jumpToSegment: safeJumpToSegment,
    isController: showcallerState.isController,
    isInitialized: showcallerState.isInitialized,
    isConnected
  };
};
