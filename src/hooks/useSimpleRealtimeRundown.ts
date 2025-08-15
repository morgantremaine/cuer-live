import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUniversalTimer } from './useUniversalTimer';

interface UseSimpleRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate: (data: any) => void;
  enabled?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
}

export const useSimpleRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  enabled = true,
  trackOwnUpdate
}: UseSimpleRealtimeRundownProps) => {
  const { user } = useAuth();
  const { setTimeout: setManagedTimeout } = useUniversalTimer('SimpleRealtimeRundown');
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const lastStateKeyRef = useRef<string>(''); // Move this to top level
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const connectionStableRef = useRef(false);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Simple own update tracking
  const trackOwnUpdateLocal = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 5 seconds
    setManagedTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 5000);
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Simplified update handler - NO complex filtering
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📡 Simple realtime update received:', {
      id: payload.new?.id,
      timestamp: payload.new?.updated_at,
      itemCount: payload.new?.items?.length
    });

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    const updateTimestamp = payload.new?.updated_at;
    
    // Skip if this is exactly the same timestamp we just processed
    if (updateTimestamp === lastProcessedUpdateRef.current) {
      console.log('⏭️ Skipping - same timestamp as last processed');
      return;
    }

    // Skip if this is our own update (simple check)
    if (ownUpdateTrackingRef.current.has(updateTimestamp)) {
      console.log('⏭️ Skipping - our own update');
      lastProcessedUpdateRef.current = updateTimestamp;
      return;
    }

    // ALL OTHER UPDATES GO THROUGH - no complex filtering
    console.log('✅ Processing realtime update from teammate');
    lastProcessedUpdateRef.current = updateTimestamp;
    
    // Show processing state briefly
    setIsProcessingUpdate(true);
    
    try {
      // Apply the update directly
      onRundownUpdateRef.current(payload.new);
    } catch (error) {
      console.error('Error processing realtime update:', error);
    }
    
    // Clear processing state after short delay using managed timer
    setManagedTimeout(() => {
      setIsProcessingUpdate(false);
    }, 500);
    
  }, [rundownId]);

  useEffect(() => {
    // Only log dependency check once per unique state combination to reduce console noise
    const stateKey = `${!!rundownId}-${!!user}-${enabled}`;
    
    if (stateKey !== lastStateKeyRef.current) {
      console.log('🔧 Simple realtime dependency check:', {
        rundownId: !!rundownId,
        rundownIdValue: rundownId,
        user: !!user,
        userValue: user?.id,
        enabled,
        hasAllRequirements: !!rundownId && !!user && enabled
      });
      lastStateKeyRef.current = stateKey;
    }
    
    // Clear any existing subscription FIRST
    if (subscriptionRef.current) {
      console.log('🔄 Clearing existing simple realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      // Don't immediately set disconnected - wait for the new connection to stabilize
      if (!connectionStableRef.current) {
        setIsConnected(false);
      }
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      console.log('⏸️ Simple realtime disabled:', { rundownId: !!rundownId, user: !!user, enabled });
      return;
    }
    
    console.log('🚀 Setting up simple realtime subscription for rundown:', rundownId);
    
    // Create unique channel name to avoid conflicts
    const channelName = `simple-realtime-${rundownId}-${user.id}-${Date.now()}`;
    
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('🔗 Simple realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          connectionStableRef.current = true;
          console.log('✅ Simple realtime connected successfully');
        } else if (status === 'CHANNEL_ERROR') {
          connectionStableRef.current = false;
          // Add a small delay before showing disconnect to avoid flicker
          setManagedTimeout(() => {
            if (!connectionStableRef.current) {
              setIsConnected(false);
            }
          }, 1000);
          console.error('❌ Simple realtime channel error');
        } else if (status === 'TIMED_OUT') {
          connectionStableRef.current = false;
          // Add a small delay before showing disconnect to avoid flicker
          setManagedTimeout(() => {
            if (!connectionStableRef.current) {
              setIsConnected(false);
            }
          }, 1000);
          console.error('⏰ Simple realtime connection timed out');
        } else if (status === 'CLOSED') {
          connectionStableRef.current = false;
          // Only set disconnected if the connection was stable before
          if (subscriptionRef.current) {
            setManagedTimeout(() => {
              if (!connectionStableRef.current) {
                setIsConnected(false);
              }
            }, 500);
          }
          console.log('🔄 Simple realtime status:', status);
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up simple realtime subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      connectionStableRef.current = false;
      setIsConnected(false);
      setIsProcessingUpdate(false);
    };
  }, [rundownId, user?.id, enabled]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
