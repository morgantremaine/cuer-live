import { useRef, useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useUniversalTimer } from './useUniversalTimer';

interface UseConsolidatedRealtimeProps {
  rundownId: string | null;
  onContentUpdate?: (data: any) => void;
  onShowcallerUpdate?: (state: any) => void;
  onShowcallerActivity?: (active: boolean) => void;
  trackOwnUpdate?: (timestamp: string) => void;
  enabled?: boolean;
  lastSeenDocVersion?: number;
}

// Single global subscription manager to prevent duplicate subscriptions
const globalSubscriptions = new Map<string, {
  channel: any;
  contentCallbacks: Set<(data: any) => void>;
  showcallerCallbacks: Set<(state: any) => void>;
  trackingCallbacks: Set<(timestamp: string) => void>;
  count: number;
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onContentUpdate,
  onShowcallerUpdate,
  onShowcallerActivity,
  trackOwnUpdate,
  enabled = true,
  lastSeenDocVersion
}: UseConsolidatedRealtimeProps) => {
  const { user } = useAuth();
  const { setTimeout: setManagedTimeout } = useUniversalTimer('ConsolidatedRealtime');
  const [isConnected, setIsConnected] = useState(false);
  const ownUpdatesRef = useRef<Set<string>>(new Set());
  const connectionStableRef = useRef(false);
  const lastErrorLogRef = useRef(0);

  // Track own updates to prevent echo
  const trackOwnUpdateInternal = useCallback((timestamp: string) => {
    ownUpdatesRef.current.add(timestamp);
    trackOwnUpdate?.(timestamp);
    // Clean up old timestamps after 30 seconds
    setManagedTimeout(() => {
      ownUpdatesRef.current.delete(timestamp);
    }, 30000);
  }, [trackOwnUpdate, setManagedTimeout]);

  const processUpdate = useCallback((payload: any) => {
    const updatedData = payload.new;
    const updatedAt = updatedData.updated_at;

    // Skip if this is our own update
    if (ownUpdatesRef.current.has(updatedAt)) {
      console.log('⏭️ Skipping own update:', updatedAt);
      return;
    }

    // Skip if we've already seen this doc version
    if (lastSeenDocVersion && updatedData.doc_version <= lastSeenDocVersion) {
      console.log('⏭️ Skipping old doc version:', updatedData.doc_version);
      return;
    }

    console.log('📡 Processing realtime update:', {
      docVersion: updatedData.doc_version,
      updatedAt,
      hasShowcallerState: !!updatedData.showcaller_state
    });

    // Send content updates to all content subscribers
    if (onContentUpdate) {
      onContentUpdate(updatedData);
    }

    // Send showcaller updates to all showcaller subscribers
    if (onShowcallerUpdate && updatedData.showcaller_state) {
      onShowcallerUpdate(updatedData.showcaller_state);
    }
  }, [onContentUpdate, onShowcallerUpdate, lastSeenDocVersion]);

  useEffect(() => {
    if (!rundownId || !user || !enabled) {
      return;
    }

    const subscriptionKey = rundownId;
    let subscription = globalSubscriptions.get(subscriptionKey);

    if (subscription) {
      // Add callbacks to existing subscription
      subscription.count++;
      if (onContentUpdate) subscription.contentCallbacks.add(onContentUpdate);
      if (onShowcallerUpdate) subscription.showcallerCallbacks.add(onShowcallerUpdate);
      if (trackOwnUpdate) subscription.trackingCallbacks.add(trackOwnUpdate);
      
      console.log(`📡 Joined existing realtime subscription for ${rundownId} (${subscription.count} listeners)`);
      setIsConnected(true);
    } else {
      // Create new subscription
      console.log(`📡 Creating new realtime subscription for ${rundownId}`);
      
      const channel = supabase
        .channel(`consolidated-${rundownId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rundowns',
            filter: `id=eq.${rundownId}`
          },
          (payload) => {
            const updatedData = payload.new;
            const updatedAt = updatedData.updated_at;

            // Skip if this is our own update
            if (ownUpdatesRef.current.has(updatedAt)) {
              return;
            }

            // Notify all content subscribers
            subscription?.contentCallbacks.forEach(callback => {
              try {
                callback(updatedData);
              } catch (error) {
                console.error('Error in content callback:', error);
              }
            });

            // Notify all showcaller subscribers
            if (updatedData.showcaller_state) {
              subscription?.showcallerCallbacks.forEach(callback => {
                try {
                  callback(updatedData.showcaller_state);
                } catch (error) {
                  console.error('Error in showcaller callback:', error);
                }
              });
            }
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            connectionStableRef.current = true;
            console.log('✅ Consolidated realtime connected successfully');
          } else if (status === 'CHANNEL_ERROR') {
            connectionStableRef.current = false;
            setManagedTimeout(() => {
              if (!connectionStableRef.current) {
                setIsConnected(false);
              }
            }, 1000);
            
            // Throttle error logging
            const now = Date.now();
            if (now - lastErrorLogRef.current > 3000) {
              console.error('❌ Consolidated realtime channel error');
              lastErrorLogRef.current = now;
            }
          } else if (status === 'TIMED_OUT') {
            connectionStableRef.current = false;
            setManagedTimeout(() => {
              if (!connectionStableRef.current) {
                setIsConnected(false);
              }
            }, 1000);
            console.error('⏰ Consolidated realtime connection timed out');
          } else if (status === 'CLOSED') {
            connectionStableRef.current = false;
            setIsConnected(false);
            console.log('🔌 Consolidated realtime connection closed');
          }
        });

      subscription = {
        channel,
        contentCallbacks: new Set(onContentUpdate ? [onContentUpdate] : []),
        showcallerCallbacks: new Set(onShowcallerUpdate ? [onShowcallerUpdate] : []),
        trackingCallbacks: new Set(trackOwnUpdate ? [trackOwnUpdate] : []),
        count: 1
      };

      globalSubscriptions.set(subscriptionKey, subscription);
    }

    // Cleanup on unmount
    return () => {
      const currentSubscription = globalSubscriptions.get(subscriptionKey);
      if (currentSubscription) {
        currentSubscription.count--;
        
        // Remove callbacks
        if (onContentUpdate) currentSubscription.contentCallbacks.delete(onContentUpdate);
        if (onShowcallerUpdate) currentSubscription.showcallerCallbacks.delete(onShowcallerUpdate);
        if (trackOwnUpdate) currentSubscription.trackingCallbacks.delete(trackOwnUpdate);

        if (currentSubscription.count <= 0) {
          // Last subscriber - close the subscription
          console.log(`📡 Closing realtime subscription for ${rundownId}`);
          supabase.removeChannel(currentSubscription.channel);
          globalSubscriptions.delete(subscriptionKey);
        } else {
          console.log(`📡 Left realtime subscription for ${rundownId} (${currentSubscription.count} listeners remain)`);
        }
      }
      setIsConnected(false);
    };
  }, [rundownId, user, enabled, onContentUpdate, onShowcallerUpdate, trackOwnUpdate, setManagedTimeout]);

  return {
    isConnected,
    trackOwnUpdate: trackOwnUpdateInternal,
    // Legacy compatibility methods for migration
    setTypingChecker: (callback: any) => {},
    setUnsavedChecker: (callback: any) => {},
    performCatchupSync: () => {},
    isProcessingUpdate: false
  };
};