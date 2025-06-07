
import { useEffect } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerState } from './useShowcallerState';
import { useShowcallerPersistence } from './useShowcallerPersistence';
import { useShowcallerRealtime } from './useShowcallerRealtime';

export const usePlaybackControls = (
  items: RundownItem[],
  updateItem: (id: string, field: string, value: string) => void,
  rundownId?: string
) => {
  // Initialize showcaller state management
  const {
    showcallerState,
    play,
    pause,
    forward,
    backward,
    applyShowcallerState,
    isPlaying,
    currentSegmentId,
    timeRemaining
  } = useShowcallerState({
    items,
    updateItem,
    onShowcallerStateChange: (state) => {
      // Save state changes to database
      saveShowcallerState(state);
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
  useEffect(() => {
    if (rundownId) {
      loadShowcallerState().then(state => {
        if (state) {
          console.log('📺 Loading initial showcaller state:', state);
          applyShowcallerState(state);
        }
      });
    }
  }, [rundownId, loadShowcallerState, applyShowcallerState]);

  return {
    isPlaying,
    currentSegmentId,
    timeRemaining,
    play,
    pause,
    forward,
    backward
  };
};
