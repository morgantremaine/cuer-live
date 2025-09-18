import { useCallback, useRef, useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerVisualState } from './useShowcallerVisualState';

export interface SimpleShowcallerState {
  isPlaying: boolean;
  currentSegmentId: string | null;
  timeRemaining: number;
  currentItemStatuses: Record<string, string>; // Simplified to plain object
  isController: boolean;
  controllerId: string | null;
  lastUpdate: string;
}

interface UseSimpleShowcallerSyncProps {
  items: RundownItem[];
  rundownId: string | null;
  userId?: string;
  setShowcallerUpdate?: (isUpdate: boolean) => void;
  updateItem?: (id: string, field: string, value: string) => void;
}

export const useSimpleShowcallerSync = ({
  items,
  rundownId,
  userId,
  setShowcallerUpdate,
  updateItem
}: UseSimpleShowcallerSyncProps) => {
  // Use the enhanced visual state with rehearsal timer functionality
  const {
    play: visualPlay,
    pause: visualPause,
    forward: visualForward,
    backward: visualBackward,
    reset: visualReset,
    jumpToSegment: visualJumpToSegment,
    getItemVisualStatus,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    // Rehearsal timer functions and state
    isRecording,
    rehearsalElapsedTime,
    rehearsalSegmentId,
    startRecording,
    pauseRecording,
    stopRecording,
    resetRecording
  } = useShowcallerVisualState({
    items,
    rundownId,
    userId,
    updateItem
  });

  // Track showcaller activity
  useEffect(() => {
    if (setShowcallerUpdate) {
      setShowcallerUpdate(isPlaying || isRecording);
    }
  }, [isPlaying, isRecording, setShowcallerUpdate]);

  return {
    // State from visual state
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    isConnected: true, // Visual state manages its own connections
    
    // Rehearsal timer state
    isRecording,
    rehearsalElapsedTime,
    rehearsalSegmentId,
    
    // Visual status function
    getItemVisualStatus,
    
    // Control functions
    play: visualPlay,
    pause: visualPause,
    forward: visualForward,
    backward: visualBackward,
    reset: visualReset,
    jumpToSegment: visualJumpToSegment,
    
    // Rehearsal timer functions
    startRecording,
    pauseRecording,
    stopRecording,
    resetRecording
  };
};