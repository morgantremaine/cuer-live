
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
  const initialStateLoadPromise = useRef<Promise<void> | null>(null);

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

  // Enhanced initial state loading with better persistence
  const loadInitialState = useCallback(async () => {
    if (!rundownId || hasLoadedInitialState.current || initialStateLoadPromise.current) {
      return initialStateLoadPromise.current || Promise.resolve();
    }

    console.log('📺 Loading initial showcaller state for rundown:', rundownId);
    
    initialStateLoadPromise.current = (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data, error } = await supabase
          .from('rundowns')
          .select('showcaller_state')
          .eq('id', rundownId)
          .single();

        if (error) {
          console.error('❌ Error loading initial showcaller state:', error);
          return;
        }

        if (data?.showcaller_state) {
          console.log('📺 Found existing showcaller state:', data.showcaller_state);
          
          // Calculate synchronized state if it was playing
          let restoredState = { ...data.showcaller_state };
          
          if (data.showcaller_state.isPlaying && 
              data.showcaller_state.playbackStartTime && 
              data.showcaller_state.currentSegmentId) {
            
            console.log('📺 Showcaller was playing - synchronizing timing');
            
            // Find the current segment to calculate remaining time
            const currentSegment = items.find(item => item.id === data.showcaller_state.currentSegmentId);
            if (currentSegment && currentSegment.duration) {
              // Convert duration to seconds
              const timeToSeconds = (timeStr: string) => {
                const parts = timeStr.split(':').map(Number);
                if (parts.length === 2) return parts[0] * 60 + parts[1];
                if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
                return 0;
              };
              
              const segmentDuration = timeToSeconds(currentSegment.duration);
              const elapsedTime = Math.floor((Date.now() - data.showcaller_state.playbackStartTime) / 1000);
              const syncedTimeRemaining = Math.max(0, segmentDuration - elapsedTime);
              
              console.log('📺 Synchronized timing - elapsed:', elapsedTime, 'remaining:', syncedTimeRemaining);
              
              restoredState = {
                ...data.showcaller_state,
                timeRemaining: syncedTimeRemaining,
                // Update playback start time to maintain sync
                playbackStartTime: Date.now() - (elapsedTime * 1000)
              };
              
              // If time has completely elapsed, advance to next segment
              if (syncedTimeRemaining <= 0) {
                console.log('📺 Current segment elapsed during refresh - finding next segment');
                const currentIndex = items.findIndex(item => item.id === data.showcaller_state.currentSegmentId);
                const nextSegment = items.slice(currentIndex + 1).find(item => item.type === 'regular');
                
                if (nextSegment) {
                  const nextDuration = timeToSeconds(nextSegment.duration || '00:00');
                  restoredState = {
                    ...data.showcaller_state,
                    currentSegmentId: nextSegment.id,
                    timeRemaining: nextDuration,
                    playbackStartTime: Date.now()
                  };
                  console.log('📺 Advanced to next segment:', nextSegment.id);
                } else {
                  // No more segments, stop playback
                  restoredState = {
                    ...data.showcaller_state,
                    isPlaying: false,
                    currentSegmentId: null,
                    timeRemaining: 0,
                    playbackStartTime: null,
                    controllerId: null
                  };
                  console.log('📺 No more segments - stopping playback');
                }
              }
            }
          }
          
          console.log('📺 Applying restored showcaller state');
          applyExternalVisualState(restoredState);
        } else {
          console.log('📺 No existing showcaller state found');
        }
      } catch (error) {
        console.error('❌ Error loading initial state:', error);
      } finally {
        hasLoadedInitialState.current = true;
      }
    })();
    
    return initialStateLoadPromise.current;
  }, [rundownId, applyExternalVisualState, items]);

  // Load initial state when rundown or items change
  useEffect(() => {
    if (rundownId && items.length > 0) {
      // Reset loading state if rundown changes
      if (hasLoadedInitialState.current) {
        hasLoadedInitialState.current = false;
        initialStateLoadPromise.current = null;
      }
      loadInitialState();
    }
  }, [rundownId, items.length, loadInitialState]);

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
