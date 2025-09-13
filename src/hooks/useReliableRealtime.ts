import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownState } from './useRundownState';

interface ReliableRealtimeOptions {
  rundownId: string | null;
  onRemoteUpdate: (data: any) => void;
  currentDocVersion: number;
  enabled?: boolean;
}

/**
 * Simplified, bulletproof realtime system that:
 * 1. Only applies newer updates (doc_version based)
 * 2. No complex conflict resolution
 * 3. Last writer wins approach
 * 4. Reliable connection handling
 */
export const useReliableRealtime = ({
  rundownId,
  onRemoteUpdate,
  currentDocVersion,
  enabled = true
}: ReliableRealtimeOptions) => {
  const channelRef = useRef<any>(null);
  const lastProcessedVersionRef = useRef(currentDocVersion);
  
  // Update tracking ref when docVersion changes
  useEffect(() => {
    lastProcessedVersionRef.current = currentDocVersion;
  }, [currentDocVersion]);

  // Set up realtime subscription
  useEffect(() => {
    if (!rundownId || !enabled) {
      return;
    }

    console.log('🔄 ReliableRealtime: Setting up subscription for rundown:', rundownId);

    // Create subscription for this specific rundown
    const channel = supabase
      .channel(`rundown_${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => {
          console.log('📡 ReliableRealtime: Received update:', payload);
          
          const newData = payload.new as any;
          
          // Only process updates with newer doc_version
          if (newData.doc_version && newData.doc_version <= lastProcessedVersionRef.current) {
            console.log('⏭️ ReliableRealtime: Ignoring stale update', {
              incoming: newData.doc_version,
              current: lastProcessedVersionRef.current
            });
            return;
          }

          // Update our tracking
          lastProcessedVersionRef.current = newData.doc_version || lastProcessedVersionRef.current;
          
          console.log('✅ ReliableRealtime: Processing update with doc_version:', newData.doc_version);
          
          // Pass to parent for processing
          onRemoteUpdate(newData);
        }
      )
      .subscribe((status) => {
        console.log('📡 ReliableRealtime: Subscription status:', status);
      });

    channelRef.current = channel;

    // Cleanup function
    return () => {
      console.log('🧹 ReliableRealtime: Cleaning up subscription');
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, enabled, onRemoteUpdate]);

  // Return connection status
  return {
    isConnected: !!channelRef.current
  };
};