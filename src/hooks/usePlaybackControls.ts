
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
  const hasLoadedInitialState = useRef(false);

  // Initialize showcaller visual state management
  const {
    visualState,
    play,
    pause,
    forward,
    backward,
    reset,
    applyExternalVisualState,
    isPlaying,
    currentSegmentId,
    timeRemaining,
    isController,
    trackOwnUpdate
  } = useShowcallerVisualState({
    items,
    rundownId,
    userId: user?.id
  });

  // Initialize realtime synchronization with showcaller state handling
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: !!rundownId,
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: applyExternalVisualState
  });

  // Load initial showcaller state when rundown changes
  const loadInitialState = useCallback(async () => {
    if (!rundownId || hasLoadedInitialState.current) {
      return;
    }

    hasLoadedInitialState.current = true;
    
    try {
      const { supabase } = await import('@/lib/supabase');
      const { data, error } = await supabase
        .from('rundowns')
        .select('showcaller_state')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Error loading initial showcaller state:', error);
        return;
      }

      if (data?.showcaller_state) {
        console.log('📺 Loading initial showcaller state');
        applyExternalVisualState(data.showcaller_state);
      }
    } catch (error) {
      console.error('Error loading initial state:', error);
    }
  }, [rundownId, applyExternalVisualState]);

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
    reset,
    isController
  };
};
