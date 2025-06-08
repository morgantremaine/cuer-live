
import { useEffect, useCallback } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerState } from './useShowcallerState';
import { useShowcallerPersistence } from './useShowcallerPersistence';
import { useShowcallerRealtime } from './useShowcallerRealtime';
import { useAuth } from './useAuth';

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void,
  rundownId?: string
) => {
  const { user } = useAuth();

  // Initialize showcaller state management with user ID
  const {
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController
  } = useShowcallerState({
    items,
    updateItem,
    userId: user?.id, // Pass user ID for control logic
    onShowcallerStateChange: (state) => {
      // Only save if this user is the controller
      if (isController) {
        saveShowcallerState(state);
      }
    }
  });

  // Initialize persistence
  const { saveShowcallerState, loadShowcallerState } = useShowcallerPersistence({
    rundownId,
    onShowcallerStateReceived: applyShowcallerState
  });

  // Initialize realtime synchronization
  useShowcallerRealtime({
    rundownId,
    onShowcallerStateReceived: applyShowcallerState,
    enabled: !!rundownId
  });

  // Load initial showcaller state when rundown changes
  const loadInitialState = useCallback(async () => {
    if (rundownId) {
      const state = await loadShowcallerState();
      if (state) {
        applyShowcallerState(state);
      }
    }
  }, [rundownId, loadShowcallerState, applyShowcallerState]);

  useEffect(() => {
    loadInitialState();
  }, [loadInitialState]);

  return {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward,
    isController
  };
};
