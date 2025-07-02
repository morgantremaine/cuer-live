
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';

interface UseShowcallerRealtimeSyncProps {
  rundownId: string | null;
  onExternalVisualStateReceived: (state: any) => void;
  enabled?: boolean;
}

export const useShowcallerRealtimeSync = ({
  rundownId,
  onExternalVisualStateReceived,
  enabled = true
}: UseShowcallerRealtimeSyncProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const onExternalVisualStateReceivedRef = useRef(onExternalVisualStateReceived);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastProcessedShowcallerStateRef = useRef<string | null>(null);
  
  // Add processing state tracking
  const [isProcessingVisualUpdate, setIsProcessingVisualUpdate] = useState(false);
  
  // Keep callback ref updated
  onExternalVisualStateReceivedRef.current = onExternalVisualStateReceived;

  // Simplified update handler for showcaller visual state only
  const handleShowcallerVisualUpdate = useCallback(async (payload: any) => {
    console.log('🔄 Raw showcaller update received:', {
      hasShowcallerState: !!payload.new?.showcaller_state,
      rundownId: payload.new?.id,
      targetRundown: rundownId
    });

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('📺 Skipping update - not for current rundown');
      return;
    }

    // Only process showcaller_state updates, ignore main rundown content
    if (!payload.new?.showcaller_state) {
      console.log('📺 Skipping update - no showcaller_state');
      return;
    }

    const showcallerVisualState = payload.new.showcaller_state;
    
    // Create a signature of the showcaller state to detect actual changes
    const stateSignature = JSON.stringify({
      lastUpdate: showcallerVisualState.lastUpdate,
      controllerId: showcallerVisualState.controllerId,
      currentSegmentId: showcallerVisualState.currentSegmentId,
      isPlaying: showcallerVisualState.isPlaying,
      timeRemaining: showcallerVisualState.timeRemaining
    });
    
    // Check if this is the same showcaller state we already processed
    if (stateSignature === lastProcessedShowcallerStateRef.current) {
      console.log('📺 Skipping - same showcaller state already processed');
      return;
    }
    
    // Check if this is our own update using controller ID primarily
    const isOwnControllerUpdate = showcallerVisualState.controllerId === user?.id;
    
    // Also check if we have the specific timestamp tracked (for recent updates)
    const isTrackedUpdate = showcallerVisualState.lastUpdate && 
                           ownUpdateTrackingRef.current.has(showcallerVisualState.lastUpdate);
    
    const isOwnUpdate = isOwnControllerUpdate || isTrackedUpdate;
    
    console.log('📺 Processing showcaller update:', {
      hasLastUpdate: !!showcallerVisualState.lastUpdate,
      lastUpdate: showcallerVisualState.lastUpdate,
      controllerId: showcallerVisualState.controllerId,
      currentUserId: user?.id,
      isOwnControllerUpdate,
      isTrackedUpdate,
      isOwnUpdate,
      stateSignature: stateSignature.substring(0, 100) + '...'
    });

    // Skip if this update originated from this user - DO NOT set processing state
    if (isOwnUpdate) {
      console.log('📺 Skipping - own update detected (controller match or tracked timestamp)');
      // Still update the last processed state to avoid re-processing
      lastProcessedShowcallerStateRef.current = stateSignature;
      return;
    }

    // Update the last processed state
    lastProcessedShowcallerStateRef.current = stateSignature;

    // Only set processing state for external updates
    console.log('📺 External update detected - setting processing state to true');
    setIsProcessingVisualUpdate(true);

    // Clear any existing processing timeout to prevent race conditions
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    // Process the update with minimal delay
    processingTimeoutRef.current = setTimeout(() => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      try {
        console.log('📺 Processing external showcaller visual state');
        onExternalVisualStateReceivedRef.current(showcallerVisualState);
      } catch (error) {
        logger.error('Error processing showcaller visual update:', error);
      }
      
      // Clear processing state after a visible delay
      setTimeout(() => {
        if (isMountedRef.current) {
          console.log('📺 Clearing processing state');
          setIsProcessingVisualUpdate(false);
        }
      }, 600); // Slightly longer to make it more visible
      
      processingTimeoutRef.current = null;
    }, 50); // Minimal delay for processing
    
  }, [rundownId, user?.id]);

  // Function to track our own visual updates - only tracks updates from current user
  const trackOwnVisualUpdate = useCallback((lastUpdate: string) => {
    console.log('📺 Tracking own visual update:', lastUpdate);
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Clean up old tracked updates after 5 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
      console.log('📺 Cleaned up tracked update:', lastUpdate);
    }, 5000);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    
    // Clear any existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription for showcaller visual state if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }
    
    const channel = supabase
      .channel(`showcaller-visual-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleShowcallerVisualUpdate
      )
      .subscribe();

    subscriptionRef.current = channel;
    logger.log('📺 Subscribed to showcaller visual state updates for rundown:', rundownId);

    return () => {
      isMountedRef.current = false;
      
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
        processingTimeoutRef.current = null;
      }
      setIsProcessingVisualUpdate(false);
    };
  }, [rundownId, user, enabled, handleShowcallerVisualUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    isProcessingVisualUpdate,
    trackOwnVisualUpdate
  };
};
