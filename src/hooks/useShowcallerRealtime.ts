import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ShowcallerState } from './useShowcallerState';

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
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
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

    // SIMPLIFIED: Skip if this update originated from this user with shorter tracking
    if (showcallerState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerState.lastUpdate)) {
      console.log('📺 Skipping own update:', showcallerState.lastUpdate);
      return;
    }

    lastProcessedUpdateRef.current = showcallerState.lastUpdate;
    
    console.log('📺 Processing showcaller state update:', {
      controllerId: showcallerState.controllerId,
      isPlaying: showcallerState.isPlaying,
      currentSegment: showcallerState.currentSegmentId,
      fromUser: showcallerState.controllerId
    });

    // Signal showcaller activity
    signalActivity();
    
    try {
      // Apply state immediately for better sync
      onShowcallerStateReceivedRef.current(showcallerState);
    } catch (error) {
      console.error('Error processing showcaller realtime update:', error);
    }
  }, [rundownId, signalActivity]);

  // Function to track our own updates with shorter tracking time
  const trackOwnUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Signal our own activity
    signalActivity();
    
    // SHORTER CLEANUP: Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
    }, 10000);
  }, [signalActivity]);

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
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('📺 Successfully subscribed to showcaller updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [rundownId, user, enabled, handleShowcallerUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate
  };
};
