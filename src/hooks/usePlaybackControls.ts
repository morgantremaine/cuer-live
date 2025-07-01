
import { useCallback } from 'react';
import { RundownItem } from '@/types/rundown';

interface UsePlaybackControlsProps {
  items: RundownItem[];
  updateItem: (id: string, field: string, value: string) => void;
  rundownId?: string;
  onShowcallerActivity?: (active: boolean) => void;
  setShowcallerUpdate?: (isUpdate: boolean) => void;
  currentContentHash?: string;
  isEditing?: boolean;
  hasUnsavedChanges?: boolean;
  isProcessingRealtimeUpdate?: boolean;
  // Showcaller state from master hook
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  isController: boolean;
  isInitialized: boolean;
  // Showcaller controls from master hook
  play: (segmentId?: string) => void;
  pause: () => void;
  forward: () => void;
  backward: () => void;
  reset: () => void;
  jumpToSegment: (segmentId: string) => void;
}

export const usePlaybackControls = ({
  items,
  updateItem,
  rundownId,
  onShowcallerActivity,
  setShowcallerUpdate,
  currentContentHash,
  isEditing,
  hasUnsavedChanges,
  isProcessingRealtimeUpdate,
  // Showcaller state from master hook
  isPlaying,
  currentSegmentId,
  timeRemaining,
  isController,
  isInitialized,
  // Showcaller controls from master hook
  play,
  pause,
  forward,
  backward,
  reset,
  jumpToSegment
}: UsePlaybackControlsProps) => {

  // Safe control wrappers with initialization validation
  const safePlay = useCallback((segmentId?: string) => {
    if (!isInitialized) {
      console.warn('📺 Play called before initialization complete');
      return;
    }
    play(segmentId);
  }, [isInitialized, play]);

  const safePause = useCallback(() => {
    if (!isInitialized) {
      console.warn('📺 Pause called before initialization complete');
      return;
    }
    pause();
  }, [isInitialized, pause]);

  const safeForward = useCallback(() => {
    if (!isInitialized) {
      console.warn('📺 Forward called before initialization complete');
      return;
    }
    forward();
  }, [isInitialized, forward]);

  const safeBackward = useCallback(() => {
    if (!isInitialized) {
      console.warn('📺 Backward called before initialization complete');
      return;
    }
    backward();
  }, [isInitialized, backward]);

  const safeReset = useCallback(() => {
    if (!isInitialized) {
      console.warn('📺 Reset called before initialization complete');
      return;
    }
    reset();
  }, [isInitialized, reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!isInitialized) {
      console.warn('📺 JumpToSegment called before initialization complete');
      return;
    }
    jumpToSegment(segmentId);
  }, [isInitialized, jumpToSegment]);

  return {
    isPlaying: isInitialized ? isPlaying : false,
    currentSegmentId: isInitialized ? currentSegmentId : null,
    timeRemaining: isInitialized ? timeRemaining : 0,
    play: safePlay,
    pause: safePause,
    forward: safeForward,
    backward: safeBackward,
    reset: safeReset,
    jumpToSegment: safeJumpToSegment,
    isController: isInitialized ? isController : false,
    isInitialized,
    isConnected: true // Simplified - connection handled by master hook
  };
};
