
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
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  const lastProcessedStateRef = useRef<string>('');
  
  // Add processing state tracking
  const [isProcessingVisualUpdate, setIsProcessingVisualUpdate] = useState(false);
  
  // Keep callback ref updated
  onExternalVisualStateReceivedRef.current = onExternalVisualStateReceived;

  // Function to create a signature from showcaller state
  const createStateSignature = useCallback((showcallerState: any) => {
    if (!showcallerState) return '';
    
    // Create a signature from the meaningful parts of the showcaller state
    // Exclude lastUpdate timestamp to focus on actual state changes
    const { lastUpdate, ...meaningfulState } = showcallerState;
    return JSON.stringify(meaningfulState);
  }, []);

  // Check if showcaller state is fresh (within last 5 minutes - much more generous)
  const isStateFresh = useCallback((showcallerState: any) => {
    if (!showcallerState?.lastUpdate) {
      // If no timestamp, consider it fresh (could be a new state)
      return true;
    }
    
    const updateTime = new Date(showcallerState.lastUpdate).getTime();
    const now = Date.now();
    const fiveMinutesAgo = now - (5 * 60 * 1000); // 5 minutes instead of 30 seconds
    
    return updateTime > fiveMinutesAgo;
  }, []);

  // Simplified update handler for showcaller visual state only
  const handleShowcallerVisualUpdate = useCallback(async (payload: any) => {
    console.log('🔄 Raw showcaller update received:', {
      hasShowcallerState: !!payload.new?.showcaller_state,
      rundownId: payload.new?.id,
      targetRundown: rundownId,
      updateType: payload.eventType || 'UPDATE'
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
    
    // Check if this is from the current user
    if (showcallerVisualState.controllerId === user?.id) {
      console.log('📺 Skipping - update from current user');
      return;
    }

    // Check if the state is fresh (more generous 5-minute window)
    if (!isStateFresh(showcallerVisualState)) {
      console.log('📺 Skipping - stale showcaller state (older than 5 minutes)');
      return;
    }

    // Create a signature of the current state
    const currentStateSignature = createStateSignature(showcallerVisualState);
    
    // Check if this is actually a new state or just a re-broadcast
    if (currentStateSignature === lastProcessedStateRef.current) {
      console.log('📺 Skipping - same showcaller state as last processed');
      return;
    }

    console.log('📺 Processing fresh external showcaller update:', {
      hasLastUpdate: !!showcallerVisualState.lastUpdate,
      lastUpdate: showcallerVisualState.lastUpdate,
      controllerId: showcallerVisualState.controllerId,
      currentUserId: user?.id,
      isGenuineExternalUpdate: true
    });

    // Update the last processed state
    lastProcessedStateRef.current = currentStateSignature;

    // Set processing state immediately
    console.log('📺 Setting processing state to true for genuine external update');
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
    
  }, [rundownId, user?.id, isStateFresh, createStateSignature]);

  // Function to track our own visual updates - this should be called when we make showcaller changes
  const trackOwnVisualUpdate = useCallback((showcallerState: any) => {
    if (!showcallerState) return;
    
    console.log('📺 Tracking own showcaller state change');
    const stateSignature = createStateSignature(showcallerState);
    lastProcessedStateRef.current = stateSignature;
  }, [createStateSignature]);

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
