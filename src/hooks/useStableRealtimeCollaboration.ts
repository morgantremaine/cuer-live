
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseStableRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  enabled?: boolean;
}

export const useStableRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  enabled = true
}: UseStableRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use refs to store stable values and prevent re-renders
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const currentRundownIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  
  // Update refs when values change, but don't trigger effects
  currentRundownIdRef.current = rundownId;
  userIdRef.current = user?.id || null;
  onRemoteUpdateRef.current = onRemoteUpdate;

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Raw realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: payload.new?.user_id,
      currentUserId: userIdRef.current,
      timestamp: payload.commit_timestamp
    });

    // Only process updates for the current rundown
    if (!currentRundownIdRef.current || payload.new?.id !== currentRundownIdRef.current) {
      console.log('⏭️ Ignoring - wrong rundown');
      return;
    }

    // Don't process our own updates
    if (payload.new?.user_id === userIdRef.current) {
      console.log('⏭️ Ignoring - our own update');
      return;
    }

    console.log('✅ Processing remote update from teammate');
    
    // Apply the update using the current ref
    onRemoteUpdateRef.current();
    
    // Show notification
    toast({
      title: 'Rundown Updated',
      description: 'Your teammate made changes to this rundown',
      duration: 3000,
    });
  }, [toast]);

  // Single stable effect that only runs when essential values change
  useEffect(() => {
    // Skip if we don't have required data
    if (!enabled || !user?.id || !rundownId) {
      cleanup();
      return;
    }

    // Skip if we already have a subscription for the same rundown
    if (subscriptionRef.current && currentRundownIdRef.current === rundownId) {
      console.log('📋 Already subscribed to this rundown, skipping');
      return;
    }

    // Cleanup any existing subscription
    cleanup();

    console.log('✅ Setting up realtime subscription for rundown:', rundownId);
    
    // Create unique channel ID
    const channelId = `rundown-collaboration-${rundownId}`;
    
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

    // Cleanup on unmount
    return cleanup;
  }, [user?.id, rundownId, enabled, handleRealtimeUpdate, cleanup]);

  return {
    isConnected: isConnectedRef.current
  };
};
