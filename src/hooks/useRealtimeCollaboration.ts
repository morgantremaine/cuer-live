
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  enabled?: boolean;
}

export const useRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  enabled = true
}: UseRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const channelIdRef = useRef<string | null>(null);

  // Create a stable channel ID
  const channelId = rundownId ? `rundown-collaboration-${rundownId}` : null;

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      channelIdRef.current = null;
    }
  }, []);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Raw realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: payload.new?.user_id,
      currentUserId: user?.id,
      timestamp: payload.commit_timestamp
    });

    // Only process updates for the current rundown
    if (!rundownId || payload.new?.id !== rundownId) {
      console.log('⏭️ Ignoring - wrong rundown');
      return;
    }

    // CRITICAL: Don't process our own updates
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Ignoring - our own update');
      return;
    }

    console.log('✅ Processing remote update from teammate');
    
    // Apply the update
    onRemoteUpdate();
    
    // Show notification
    toast({
      title: 'Rundown Updated',
      description: 'Your teammate made changes to this rundown',
      duration: 3000,
    });
  }, [rundownId, user?.id, onRemoteUpdate, toast]);

  // Single effect that handles all subscription logic
  useEffect(() => {
    // Skip if we don't have required data
    if (!enabled || !user?.id || !channelId) {
      return cleanup;
    }

    // Skip if we already have the same subscription
    if (subscriptionRef.current && channelIdRef.current === channelId) {
      return cleanup;
    }

    // Cleanup any existing subscription
    cleanup();

    console.log('✅ Setting up realtime subscription for rundown:', rundownId);
    
    // Create new subscription
    const channel = supabase
      .channel(channelId)
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
        console.log('📡 Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates');
          isConnectedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
          cleanup();
        }
      });

    subscriptionRef.current = channel;
    channelIdRef.current = channelId;

    return cleanup;
  }, [user?.id, channelId, enabled, handleRealtimeUpdate, cleanup, rundownId]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected: isConnectedRef.current
  };
};
