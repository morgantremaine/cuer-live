
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
  const isRestoringState = useRef(false);

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

  // Load and restore initial showcaller state from database
  const loadAndRestoreInitialState = useCallback(async () => {
    if (!rundownId || hasLoadedInitialState.current || isRestoringState.current || items.length === 0) {
      return;
    }

    console.log('📺 Loading initial showcaller state for rundown:', rundownId);
    isRestoringState.current = true;
    
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
        console.log('📺 Found existing showcaller state:', {
          isPlaying: data.showcaller_state.isPlaying,
          currentSegment: data.showcaller_state.currentSegmentId,
          timeRemaining: data.showcaller_state.timeRemaining,
          controller: data.showcaller_state.controllerId
        });
        
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
        
        console.log('📺 Applying restored showcaller state - preventing reset');
        
        // Apply the external state which should prevent any reset behavior
        applyExternalVisualState(restoredState);
        
        // Mark as loaded to prevent further loading attempts
        hasLoadedInitialState.current = true;
      } else {
        console.log('📺 No existing showcaller state found');
        hasLoadedInitialState.current = true;
      }
    } catch (error) {
      console.error('❌ Error loading initial state:', error);
    } finally {
      isRestoringState.current = false;
    }
  }, [rundownId, applyExternalVisualState, items]);

  // Load initial state when rundown and items are ready
  useEffect(() => {
    if (rundownId && items.length > 0 && !hasLoadedInitialState.current && !isRestoringState.current) {
      // Small delay to ensure the visual state hook is fully initialized
      const timer = setTimeout(() => {
        loadAndRestoreInitialState();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [rundownId, items.length, loadAndRestoreInitialState]);

  // Reset loading state when rundown changes
  useEffect(() => {
    return () => {
      hasLoadedInitialState.current = false;
      isRestoringState.current = false;
    };
  }, [rundownId]);

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
