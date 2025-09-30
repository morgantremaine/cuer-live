import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ShowcallerState } from './useShowcallerState';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';

interface UseShowcallerRealtimeProps {
  rundownId: string | null;
  onShowcallerStateReceived: (state: ShowcallerState) => void;
  enabled?: boolean;
  onShowcallerActivity?: (active: boolean) => void;
}

export const useShowcallerRealtime = ({
  rundownId,
  onShowcallerStateReceived,
  enabled = true,
  onShowcallerActivity
}: UseShowcallerRealtimeProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onShowcallerStateReceivedRef = useRef(onShowcallerStateReceived);
  const onShowcallerActivityRef = useRef(onShowcallerActivity);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep callback ref updated
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;
  onShowcallerActivityRef.current = onShowcallerActivity;

  // Signal showcaller activity
  const signalActivity = useCallback(() => {
    if (onShowcallerActivityRef.current) {
      onShowcallerActivityRef.current(true);
      
      // Clear existing timeout
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      // Set timeout to clear activity after 8 seconds
      activityTimeoutRef.current = setTimeout(() => {
        if (onShowcallerActivityRef.current) {
          onShowcallerActivityRef.current(false);
        }
      }, 8000);
    }
  }, []);

  // Debounced update handler to prevent rapid-fire processing
  const handleShowcallerUpdate = useCallback(async (payload: any) => {
    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    // Check if we have showcaller_state data
    if (!payload.new?.showcaller_state) {
      return;
    }

    const showcallerState = payload.new.showcaller_state as ShowcallerState;
    
    // Prevent processing duplicate updates based on lastUpdate timestamp
    if (showcallerState.lastUpdate && showcallerState.lastUpdate === lastProcessedUpdateRef.current) {
      return;
    }

    // Skip if this update originated from this user (using centralized tracker)
    if (showcallerState.lastUpdate && rundownId && ownUpdateTracker.isTracked(showcallerState.lastUpdate, `showcaller-realtime-${rundownId}`)) {
      return;
    }

    // Debounce rapid updates to prevent conflicts
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      lastProcessedUpdateRef.current = showcallerState.lastUpdate;
      
      // Signal showcaller activity
      signalActivity();
      
      try {
        // Apply state for better sync
        onShowcallerStateReceivedRef.current(showcallerState);
      } catch (error) {
        console.error('Error processing showcaller realtime update:', error);
      }
    }, 100);
    
  }, [rundownId, signalActivity]);

  // Function to track our own updates using centralized tracker
  const trackOwnUpdate = useCallback((lastUpdate: string) => {
    if (rundownId) {
      ownUpdateTracker.track(lastUpdate, `showcaller-realtime-${rundownId}`);
    }
    
    // Signal our own activity
    signalActivity();
  }, [rundownId, signalActivity]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }
    
    const channel = supabase
      .channel(`showcaller-state-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleShowcallerUpdate
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
  }, [rundownId, user, enabled, handleShowcallerUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate
  };
};
