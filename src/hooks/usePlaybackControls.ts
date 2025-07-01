
import { useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerMaster } from './useShowcallerMaster';
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

  // Use the single master hook for all showcaller functionality
  const showcaller = useShowcallerMaster({
    items,
    rundownId: rundownId || null,
    userId: user?.id
  });

  // Enhanced control wrappers with initialization checks
  const safePlay = useCallback((segmentId?: string) => {
    if (!showcaller.isInitialized) {
      console.warn('📺 Play called before initialization complete');
      return;
    }
    console.log('📺 Safe play called');
    showcaller.play(segmentId);
  }, [showcaller.isInitialized, showcaller.play]);

  const safePause = useCallback(() => {
    if (!showcaller.isInitialized) {
      console.warn('📺 Pause called before initialization complete');
      return;
    }
    console.log('📺 Safe pause called');
    showcaller.pause();
  }, [showcaller.isInitialized, showcaller.pause]);

  const safeForward = useCallback(() => {
    if (!showcaller.isInitialized) {
      console.warn('📺 Forward called before initialization complete');
      return;
    }
    console.log('📺 Safe forward called');
    showcaller.forward();
  }, [showcaller.isInitialized, showcaller.forward]);

  const safeBackward = useCallback(() => {
    if (!showcaller.isInitialized) {
      console.warn('📺 Backward called before initialization complete');
      return;
    }
    console.log('📺 Safe backward called');
    showcaller.backward();
  }, [showcaller.isInitialized, showcaller.backward]);

  const safeReset = useCallback(() => {
    if (!showcaller.isInitialized) {
      console.warn('📺 Reset called before initialization complete');
      return;
    }
    console.log('📺 Safe reset called');
    showcaller.reset();
  }, [showcaller.isInitialized, showcaller.reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!showcaller.isInitialized) {
      console.warn('📺 JumpToSegment called before initialization complete');
      return;
    }
    console.log('📺 Safe jumpToSegment called');
    showcaller.jumpToSegment(segmentId);
  }, [showcaller.isInitialized, showcaller.jumpToSegment]);

  return {
    isPlaying: showcaller.isInitialized ? showcaller.isPlaying : false,
    currentSegmentId: showcaller.isInitialized ? showcaller.currentSegmentId : null,
    timeRemaining: showcaller.isInitialized ? showcaller.timeRemaining : 0,
    play: safePlay,
    pause: safePause,
    forward: safeForward,
    backward: safeBackward,
    reset: safeReset,
    jumpToSegment: safeJumpToSegment,
    isController: showcaller.isInitialized ? showcaller.isController : false,
    isInitialized: showcaller.isInitialized,
    isConnected: true // Always connected through the master hook
  };
};
