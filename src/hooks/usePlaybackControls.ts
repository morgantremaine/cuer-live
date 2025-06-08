
import { useEffect, useCallback, useRef } from 'react';
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
  const hasLoadedInitialState = useRef(false);

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
    userId: user?.id,
    onShowcallerStateChange: (state) => {
      // Only save if this user is the controller
      if (isController) {
        console.log('📺 State changed, saving...');
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

  // Load initial showcaller state when rundown changes - with proper memoization
  const loadInitialState = useCallback(async () => {
    if (!rundownId || hasLoadedInitialState.current) {
      return;
    }

    console.log('📺 Loading initial showcaller state for rundown:', rundownId);
    hasLoadedInitialState.current = true;
    
    try {
      const state = await loadShowcallerState();
      if (state) {
        console.log('📺 Applying loaded state:', state);
        applyShowcallerState(state);
      } else {
        console.log('📺 No initial state found');
      }
    } catch (error) {
      console.error('📺 Error loading initial state:', error);
    }
  }, [rundownId]); // Only depend on rundownId

  // Reset the loading flag when rundownId changes
  useEffect(() => {
    if (rundownId) {
      hasLoadedInitialState.current = false;
      loadInitialState();
    }
  }, [rundownId, loadInitialState]);

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
