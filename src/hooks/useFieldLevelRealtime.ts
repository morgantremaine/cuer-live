/**
 * SIMPLIFIED FIELD-LEVEL REAL-TIME
 * 
 * Just listens to database changes and calls callback.
 * No queuing, no protection, no complexity.
 * Immediate propagation of all changes.
 */

import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseFieldLevelRealtimeProps {
  rundownId: string | null;
  onRealtimeUpdate: (payload: any) => void;
  enabled?: boolean;
}

export const useFieldLevelRealtime = ({
  rundownId,
  onRealtimeUpdate,
  enabled = true
}: UseFieldLevelRealtimeProps) => {
  
  const subscriptionRef = useRef<any>(null);
  const callbackRef = useRef(onRealtimeUpdate);
  
  // Keep callback ref updated
  callbackRef.current = onRealtimeUpdate;

  useEffect(() => {
    // Clean up existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Simplified RT: Cleaning up subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only subscribe if we have required data
    if (!rundownId || !enabled) {
      return;
    }

    console.log('📡 Simplified RT: Setting up real-time for rundown:', rundownId);

    // Create simple real-time subscription
    const channel = supabase
      .channel(`simple-realtime-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📨 Simplified RT: Update received', {
            docVersion: payload.new?.doc_version,
            timestamp: payload.new?.updated_at
          });
          
          try {
            callbackRef.current(payload);
          } catch (error) {
            console.error('❌ Simplified RT: Error in callback:', error);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Simplified RT: Subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Simplified RT: Successfully subscribed');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Simplified RT: Subscription failed');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Simplified RT: Cleaning up on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, enabled]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
