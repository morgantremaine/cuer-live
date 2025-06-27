
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

  // Initialize showcaller visual state management with proper initialization handling
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
    isInitialized
  } = useShowcallerVisualState({
    items,
    rundownId,
    userId: user?.id
  });

  // Initialize realtime synchronization with showcaller state handling
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: !!rundownId && isInitialized, // Only enable after initialization
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: applyExternalVisualState
  });

  // Only expose controls after initialization is complete
  const controlsReady = isInitialized;

  return {
    isPlaying: controlsReady ? isPlaying : false,
    currentSegmentId: controlsReady ? currentSegmentId : null,
    timeRemaining: controlsReady ? timeRemaining : 0,
    play: controlsReady ? play : () => {},
    pause: controlsReady ? pause : () => {},
    forward: controlsReady ? forward : () => {},
    backward: controlsReady ? backward : () => {},
    reset: controlsReady ? reset : () => {},
    jumpToSegment: controlsReady ? jumpToSegment : () => {},
    isController: controlsReady ? isController : false,
    isInitialized
  };
};
