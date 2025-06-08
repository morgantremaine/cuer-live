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
  
  // Keep callback ref updated
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;

  const handleShowcallerUpdate = useCallback(async (payload: any) => {
    // Skip if this is our own update - more reliable check
    if (payload.new?.user_id === user?.id) {
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    // Check if we have showcaller_state data
    if (!payload.new?.showcaller_state) {
      return;
    }

    // Prevent processing duplicate updates
    const updateTimestamp = payload.new?.updated_at;
    if (updateTimestamp && updateTimestamp === lastProcessedUpdateRef.current) {
      return;
    }
    lastProcessedUpdateRef.current = updateTimestamp;
    
    try {
      const showcallerState = payload.new.showcaller_state as ShowcallerState;
      
      // Apply state immediately for perfect sync
      onShowcallerStateReceivedRef.current(showcallerState);
    } catch (error) {
      console.error('Error processing showcaller realtime update:', error);
    }
  }, [rundownId, user?.id]);

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
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, enabled, handleShowcallerUpdate]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
