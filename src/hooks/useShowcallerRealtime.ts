import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { ShowcallerState } from './useShowcallerState';

interface UseShowcallerRealtimeProps {
  rundownId: string | null;
  onShowcallerStateReceived: (state: ShowcallerState) => void;
  enabled?: boolean;
}

export const useShowcallerRealtime = ({
  rundownId,
  onShowcallerStateReceived,
  enabled = true
}: UseShowcallerRealtimeProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onShowcallerStateReceivedRef = useRef(onShowcallerStateReceived);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  
  // Keep callback ref updated
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;

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

    // Enhanced filtering: Skip if this update originated from this user
    if (showcallerState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerState.lastUpdate)) {
      return;
    }

    // IMPROVED: More intelligent controller detection
    // Skip if this user is currently the controller AND the update came from them
    if (showcallerState.controllerId === user?.id) {
      // But allow non-controller updates to pass through for display synchronization
      const updateTime = new Date(showcallerState.lastUpdate).getTime();
      const now = Date.now();
      if (now - updateTime < 1000) { // Within 1 second, likely from this controller
        return;
      }
    }
    
    lastProcessedUpdateRef.current = showcallerState.lastUpdate;
    
    try {
      // Apply state immediately for perfect sync
      onShowcallerStateReceivedRef.current(showcallerState);
    } catch (error) {
      console.error('Error processing showcaller realtime update:', error);
    }
  }, [rundownId, user?.id]);

  // Function to track our own updates to prevent processing them
  const trackOwnUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    
    // Clean up old tracked updates after 30 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
    }, 30000);
  }, []);

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
      .channel(`showcaller-${rundownId}`)
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
    };
  }, [rundownId, user, enabled, handleShowcallerUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate
  };
};
