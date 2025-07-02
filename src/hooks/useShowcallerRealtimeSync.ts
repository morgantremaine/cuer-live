
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
  
  // Add state for processing status
  const [isProcessingVisualUpdate, setIsProcessingVisualUpdate] = useState(false);
  
  // Keep callback ref updated
  onExternalVisualStateReceivedRef.current = onExternalVisualStateReceived;

  // Simplified update handler for showcaller visual state only
  const handleShowcallerVisualUpdate = useCallback(async (payload: any) => {
    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    // Only process showcaller_state updates, ignore main rundown content
    if (!payload.new?.showcaller_state) {
      return;
    }

    const showcallerVisualState = payload.new.showcaller_state;
    
    // Prevent processing duplicate updates
    if (showcallerVisualState.lastUpdate && showcallerVisualState.lastUpdate === lastProcessedUpdateRef.current) {
      return;
    }

    // Skip if this update originated from this user
    if (showcallerVisualState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerVisualState.lastUpdate)) {
      return;
    }

    // Clear any existing processing timeout to prevent race conditions
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
      processingTimeoutRef.current = null;
    }

    // Set processing state to show blue wifi icon
    setIsProcessingVisualUpdate(true);

    // Simplified processing without excessive debouncing
    processingTimeoutRef.current = setTimeout(() => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      lastProcessedUpdateRef.current = showcallerVisualState.lastUpdate;
      
      try {
        logger.log('📺 Received external showcaller visual state');
        onExternalVisualStateReceivedRef.current(showcallerVisualState);
      } catch (error) {
        logger.error('Error processing showcaller visual update:', error);
      } finally {
        // Reset processing state after update is complete
        setTimeout(() => {
          if (isMountedRef.current) {
            setIsProcessingVisualUpdate(false);
          }
        }, 1000); // Show blue for 1 second
      }
      
      processingTimeoutRef.current = null;
    }, 100); // Reduced debounce time for better responsiveness
    
  }, [rundownId]);

  // Function to track our own visual updates
  const trackOwnVisualUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Clean up old tracked updates after 5 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
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
    };
  }, [rundownId, user, enabled, handleShowcallerVisualUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    isProcessingVisualUpdate,
    trackOwnVisualUpdate
  };
};
