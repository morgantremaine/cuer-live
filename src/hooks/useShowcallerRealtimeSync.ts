import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/utils/logger';
import { TimeoutManager } from '@/utils/realtimeUtils';

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
  const timeoutManagerRef = useRef(new TimeoutManager());
  const isMountedRef = useRef(true);
  
  // Showcaller processing state tracking
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

    // Skip if this update originated from this user
    if (showcallerVisualState.controllerId === user?.id) {
      return;
    }

    // Additional check: skip if we have this update tracked as our own
    if (showcallerVisualState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerVisualState.lastUpdate)) {
      return;
    }

    // Skip stale showcaller state (older than 10 minutes) to prevent false team sync indicators
    if (showcallerVisualState.lastUpdate) {
      const updateTime = new Date(showcallerVisualState.lastUpdate).getTime();
      const now = Date.now();
      const ageInMinutes = (now - updateTime) / (1000 * 60);
      
      if (ageInMinutes > 10) {
        return;
      }
    }

    // Only set processing state AFTER all validation checks pass
    setIsProcessingVisualUpdate(true);

    // Clear any existing processing timeout to prevent race conditions
    timeoutManagerRef.current.clear('visual-processing');

    // Process the update with minimal delay
    timeoutManagerRef.current.set('visual-processing', () => {
      // Check if component is still mounted
      if (!isMountedRef.current) {
        return;
      }
      
      try {
        onExternalVisualStateReceivedRef.current(showcallerVisualState);
      } catch (error) {
        logger.error('Error processing showcaller visual update:', error);
      }
      
      // Clear processing state after a visible delay
      timeoutManagerRef.current.set('visual-processing-clear', () => {
        if (isMountedRef.current) {
          setIsProcessingVisualUpdate(false);
        }
      }, 600);
      
    }, 50);
    
  }, [rundownId, user?.id]);

  // Function to track our own visual updates - only tracks updates from current user
  const trackOwnVisualUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Clean up old tracked updates after 5 seconds
    timeoutManagerRef.current.set(`cleanup-visual-${lastUpdate}`, () => {
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

    return () => {
      isMountedRef.current = false;
      
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      timeoutManagerRef.current.clearAll();
      setIsProcessingVisualUpdate(false);
    };
  }, [rundownId, user, enabled, handleShowcallerVisualUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    isProcessingVisualUpdate,
    trackOwnVisualUpdate
  };
};
