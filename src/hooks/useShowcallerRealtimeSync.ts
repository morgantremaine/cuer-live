
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
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onExternalVisualStateReceivedRef = useRef(onExternalVisualStateReceived);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);
  
  // Add processing state tracking
  const [isProcessingVisualUpdate, setIsProcessingVisualUpdate] = useState(false);
  
  // Keep callback ref updated
  onExternalVisualStateReceivedRef.current = onExternalVisualStateReceived;

  // Simplified update handler for showcaller visual state only
  const handleShowcallerVisualUpdate = useCallback(async (payload: any) => {
    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      logger.log('📺 Skipping update - not for current rundown');
      return;
    }

    // Only process showcaller_state updates, ignore main rundown content
    if (!payload.new?.showcaller_state) {
      logger.log('📺 Skipping update - no showcaller_state');
      return;
    }

    const showcallerVisualState = payload.new.showcaller_state;
    
    // Debug logging for better visibility
    logger.log('📺 Received showcaller update:', {
      hasLastUpdate: !!showcallerVisualState.lastUpdate,
      lastUpdate: showcallerVisualState.lastUpdate,
      lastProcessed: lastProcessedUpdateRef.current,
      isOwnUpdate: showcallerVisualState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerVisualState.lastUpdate),
      controllerId: showcallerVisualState.controllerId,
      currentUserId: user?.id
    });

    // Skip if this is exactly the same update we just processed
    if (showcallerVisualState.lastUpdate && showcallerVisualState.lastUpdate === lastProcessedUpdateRef.current) {
      logger.log('📺 Skipping - exact duplicate update');
      return;
    }

    // Skip if this update originated from this user (but allow external updates through)
    if (showcallerVisualState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerVisualState.lastUpdate)) {
      logger.log('📺 Skipping - own update detected');
      return;
    }

    // Set processing state immediately
    logger.log('📺 Setting processing state to true');
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
      
      // Update last processed timestamp
      lastProcessedUpdateRef.current = showcallerVisualState.lastUpdate;
      
      try {
        logger.log('📺 Processing external showcaller visual state');
        onExternalVisualStateReceivedRef.current(showcallerVisualState);
      } catch (error) {
        logger.error('Error processing showcaller visual update:', error);
      }
      
      // Clear processing state after a visible delay
      setTimeout(() => {
        if (isMountedRef.current) {
          logger.log('📺 Clearing processing state');
          setIsProcessingVisualUpdate(false);
        }
      }, 600); // Slightly longer to make it more visible
      
      processingTimeoutRef.current = null;
    }, 50); // Minimal delay for processing
    
  }, [rundownId, user?.id]);

  // Function to track our own visual updates - only tracks updates from current user
  const trackOwnVisualUpdate = useCallback((lastUpdate: string) => {
    logger.log('📺 Tracking own visual update:', lastUpdate);
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Clean up old tracked updates after 5 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
      logger.log('📺 Cleaned up tracked update:', lastUpdate);
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
