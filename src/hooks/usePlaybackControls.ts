
import { useEffect, useCallback, useRef } from 'react';
import { RundownItem } from '@/types/rundown';
import { useShowcallerConsolidatedTiming } from './useShowcallerConsolidatedTiming';
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
  const initializationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());

  // Track our own updates to prevent feedback loops
  const trackOwnUpdate = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 10000);
  }, []);

  // Save state function for the consolidated timing
  const saveShowcallerState = useCallback(async (state: any) => {
    if (!rundownId) return;

    try {
      console.log('📺 Saving consolidated showcaller state');
      trackOwnUpdate(state.lastUpdate);
      
      const { supabase } = await import('@/lib/supabase');
      
      // Convert Map to plain object for storage
      const stateToSave = {
        ...state,
        currentItemStatuses: state.currentItemStatuses instanceof Map 
          ? Object.fromEntries(state.currentItemStatuses)
          : state.currentItemStatuses
      };

      const { error } = await supabase
        .from('rundowns')
        .update({
          showcaller_state: stateToSave,
          updated_at: new Date().toISOString()
        })
        .eq('id', rundownId);

      if (error) {
        console.error('❌ Failed to save consolidated showcaller state:', error);
      } else {
        console.log('📺 Successfully saved consolidated showcaller state');
      }
    } catch (error) {
      console.error('❌ Error saving consolidated showcaller state:', error);
    }
  }, [rundownId, trackOwnUpdate]);

  // Handle external state updates
  const handleExternalState = useCallback((externalState: any) => {
    // Skip if this is our own update
    if (ownUpdateTrackingRef.current.has(externalState.lastUpdate)) {
      console.log('⏭️ Skipping own showcaller update');
      return;
    }

    console.log('📺 Received external showcaller state for consolidated timing');
    consolidatedTiming.applyExternalState(externalState);
  }, []);

  // Initialize consolidated timing system
  const consolidatedTiming = useShowcallerConsolidatedTiming({
    items,
    rundownId,
    userId: user?.id,
    onSaveState: saveShowcallerState,
    onExternalStateReceived: handleExternalState
  });

  // Enhanced initialization check
  const shouldEnableRealtime = useCallback(() => {
    return !!rundownId && consolidatedTiming.isInitialized;
  }, [rundownId, consolidatedTiming.isInitialized]);

  // Initialize realtime synchronization
  const { isConnected } = useRealtimeRundown({
    rundownId,
    onRundownUpdate: () => {}, // We only care about showcaller state here
    enabled: shouldEnableRealtime(),
    currentContentHash,
    isEditing,
    hasUnsavedChanges,
    isProcessingRealtimeUpdate,
    trackOwnUpdate,
    onShowcallerActivity,
    onShowcallerStateReceived: handleExternalState
  });

  // Initialization timeout with better logging
  useEffect(() => {
    if (rundownId && !consolidatedTiming.isInitialized) {
      console.log('📺 Starting consolidated timing initialization timeout');
      initializationTimeoutRef.current = setTimeout(() => {
        console.warn('📺 Consolidated timing initialization timeout - this may indicate an issue');
      }, 2000);
    } else if (consolidatedTiming.isInitialized && initializationTimeoutRef.current) {
      console.log('📺 Consolidated timing initialized successfully');
      clearTimeout(initializationTimeoutRef.current);
      initializationTimeoutRef.current = null;
    }

    return () => {
      if (initializationTimeoutRef.current) {
        clearTimeout(initializationTimeoutRef.current);
      }
    };
  }, [rundownId, consolidatedTiming.isInitialized]);

  // Only expose controls after proper initialization
  const controlsReady = consolidatedTiming.isInitialized;

  // Enhanced control wrappers with consolidated timing
  const safePlay = useCallback((segmentId?: string) => {
    if (!controlsReady) {
      console.warn('📺 Play called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe play called with consolidated timing:', { segmentId });
    consolidatedTiming.play(segmentId);
  }, [controlsReady, consolidatedTiming.play]);

  const safePause = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Pause called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe pause called with consolidated timing');
    consolidatedTiming.pause();
  }, [controlsReady, consolidatedTiming.pause]);

  const safeForward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Forward called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe forward called with consolidated timing');
    consolidatedTiming.forward();
  }, [controlsReady, consolidatedTiming.forward]);

  const safeBackward = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Backward called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe backward called with consolidated timing');
    consolidatedTiming.backward();
  }, [controlsReady, consolidatedTiming.backward]);

  const safeReset = useCallback(() => {
    if (!controlsReady) {
      console.warn('📺 Reset called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe reset called with consolidated timing');
    consolidatedTiming.reset();
  }, [controlsReady, consolidatedTiming.reset]);

  const safeJumpToSegment = useCallback((segmentId: string) => {
    if (!controlsReady) {
      console.warn('📺 JumpToSegment called before consolidated timing initialization complete');
      return;
    }
    console.log('📺 Safe jumpToSegment called with consolidated timing:', segmentId);
    consolidatedTiming.jumpToSegment(segmentId);
  }, [controlsReady, consolidatedTiming.jumpToSegment]);

  return {
    isPlaying: controlsReady ? consolidatedTiming.isPlaying : false,
    currentSegmentId: controlsReady ? consolidatedTiming.currentSegmentId : null,
    timeRemaining: controlsReady ? consolidatedTiming.timeRemaining : 0,
    play: safePlay,
    pause: safePause,
    forward: safeForward,
    backward: safeBackward,
    reset: safeReset,
    jumpToSegment: safeJumpToSegment,
    isController: controlsReady ? consolidatedTiming.isController : false,
    isInitialized: consolidatedTiming.isInitialized,
    isConnected
  };
};
