import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface UseDirectShowcallerRealtimeProps {
  rundownId: string | null;
  onShowcallerStateReceived: (state: any) => void;
  onShowcallerActivity?: (active: boolean) => void;
}

export const useDirectShowcallerRealtime = ({
  rundownId,
  onShowcallerStateReceived,
  onShowcallerActivity
}: UseDirectShowcallerRealtimeProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep callback refs updated
  const onShowcallerStateReceivedRef = useRef(onShowcallerStateReceived);
  const onShowcallerActivityRef = useRef(onShowcallerActivity);
  onShowcallerStateReceivedRef.current = onShowcallerStateReceived;
  onShowcallerActivityRef.current = onShowcallerActivity;

  // Signal showcaller activity
  const signalActivity = useCallback(() => {
    if (onShowcallerActivityRef.current) {
      onShowcallerActivityRef.current(true);
      
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
      
      activityTimeoutRef.current = setTimeout(() => {
        if (onShowcallerActivityRef.current) {
          onShowcallerActivityRef.current(false);
        }
      }, 6000); // 6 second timeout for mobile optimization
    }
  }, []);

  // Handle showcaller updates directly
  const handleShowcallerUpdate = useCallback((payload: any) => {
    if (payload.new?.id !== rundownId) return;
    
    const showcallerState = payload.new?.showcaller_state;
    if (!showcallerState) return;

    // Skip our own updates
    if (showcallerState.lastUpdate && ownUpdateTrackingRef.current.has(showcallerState.lastUpdate)) {
      return;
    }

    console.log('📺 Direct showcaller update received:', showcallerState);
    
    // Signal activity and apply state immediately
    signalActivity();
    onShowcallerStateReceivedRef.current(showcallerState);
  }, [rundownId, signalActivity]);

  // Track our own updates
  const trackOwnUpdate = useCallback((lastUpdate: string) => {
    ownUpdateTrackingRef.current.add(lastUpdate);
    signalActivity();
    
    // Clean up after 8 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(lastUpdate);
    }, 8000);
  }, [signalActivity]);

  useEffect(() => {
    // Clear existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }

    // Connect immediately when we have rundownId and user - no initialization wait
    if (!rundownId || !user) {
      console.log('📺 Direct showcaller realtime not ready:', { rundownId: !!rundownId, user: !!user });
      return;
    }
    
    console.log('📺 Setting up direct showcaller realtime for:', rundownId);
    
    const channel = supabase
      .channel(`direct-showcaller-${rundownId}`)
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
        console.log('📺 Direct showcaller subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('📺 Cleaning up direct showcaller realtime');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      }
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [rundownId, user, handleShowcallerUpdate]);

  return {
    isConnected,
    trackOwnUpdate
  };
};
