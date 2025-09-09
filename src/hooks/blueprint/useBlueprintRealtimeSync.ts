import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface UseBlueprintRealtimeSyncProps {
  rundownId: string | null;
  onRemoteUpdate: (remoteState: any) => void;
  enabled?: boolean;
}

export const useBlueprintRealtimeSync = ({
  rundownId,
  onRemoteUpdate,
  enabled = true
}: UseBlueprintRealtimeSyncProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  
  // Keep refs updated
  onRemoteUpdateRef.current = onRemoteUpdate;

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📋 Blueprint realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.rundown_id,
      updatedByUserId: payload.new?.user_id,
      currentUserId: user?.id,
      timestamp: payload.new?.updated_at
    });
    
    // Skip if this is our own update
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Skipping own blueprint update');
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.rundown_id !== rundownId) {
      console.log('⏭️ Skipping - different rundown blueprint');
      return;
    }

    // Prevent processing duplicate updates
    const updateTimestamp = payload.new?.updated_at;
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate blueprint update');
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    console.log('✅ Processing remote blueprint update from teammate');
    
    try {
      // Convert database format to state format with granular protection
      const remoteState = {
        lists: payload.new?.lists || [],
        showDate: payload.new?.show_date || '',
        notes: payload.new?.notes || '',
        cameraPlots: payload.new?.camera_plots || [],
        componentOrder: payload.new?.component_order || ['camera-plot', 'scratchpad'], // Removed 'crew-list'
        // Flag this as a granular update to prevent false unsaved changes
        isGranularUpdate: true,
        isRemoteUpdate: true,
        timestamp: updateTimestamp
      };
      
      onRemoteUpdateRef.current(remoteState);
    } catch (error) {
      console.error('Error processing blueprint realtime update:', error);
    }
  }, [rundownId, user?.id]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up existing blueprint realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }

    console.log('✅ Setting up blueprint realtime subscription for rundown:', rundownId);

    const channel = supabase
      .channel(`blueprint-sync-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprints',
          filter: `rundown_id=eq.${rundownId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('📋 Blueprint realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to blueprint realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to blueprint realtime updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up blueprint realtime subscription on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
