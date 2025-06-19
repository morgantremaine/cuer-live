
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

  // ENHANCED: Debounced update handler to prevent rapid-fire processing
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
    
    // Convert lastUpdate to string for comparison
    const lastUpdateString = showcallerState.lastUpdate?.toString();
    
    // Prevent processing duplicate updates based on lastUpdate timestamp
    if (lastUpdateString && lastUpdateString === lastProcessedUpdateRef.current) {
      console.log('📺 Skipping duplicate update:', lastUpdateString);
      return;
    }

    // Skip if this update originated from this user
    if (lastUpdateString && ownUpdateTrackingRef.current.has(lastUpdateString)) {
      console.log('📺 Skipping own update:', lastUpdateString);
      return;
    }

    // ENHANCED: Debounce rapid updates to prevent conflicts
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    processingTimeoutRef.current = setTimeout(() => {
      lastProcessedUpdateRef.current = lastUpdateString || null;
      
      console.log('📺 Processing showcaller state update:', {
        controllerId: showcallerState.controllerId,
        isPlaying: showcallerState.isPlaying,
        currentSegment: showcallerState.currentSegmentId,
        fromUser: showcallerState.controllerId,
        timestamp: showcallerState.lastUpdate
      });

      // Signal showcaller activity
      signalActivity();
      
      try {
        // Apply state for better sync
        onShowcallerStateReceivedRef.current(showcallerState);
      } catch (error) {
        console.error('Error processing showcaller realtime update:', error);
      }
    }, 100); // 100ms debounce for rapid updates
    
  }, [rundownId, signalActivity]);

  // Function to track our own updates
  const trackOwnUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Signal our own activity
    signalActivity();
    
    console.log('📺 Tracking own update:', lastUpdate, 'total tracked:', ownUpdateTrackingRef.current.size);
    
    // Clean up old tracked updates after 8 seconds (shorter window)
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
      console.log('📺 Cleaned up tracked update:', lastUpdate);
    }, 8000);
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
