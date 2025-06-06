
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
  const isSetupRef = useRef(false);

  console.log('🟢 useRealtimeCollaboration called:', {
    rundownId,
    userId: user?.id,
    enabled,
    hasExistingSubscription: !!subscriptionRef.current
  });

  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    isSetupRef.current = false;
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
    // Don't set up if already done or missing requirements
    if (isSetupRef.current || !enabled || !user?.id || !rundownId) {
      console.log('⏭️ Skipping realtime setup:', {
        alreadySetup: isSetupRef.current,
        enabled,
        hasUser: !!user?.id,
        hasRundownId: !!rundownId
      });
      return;
    }

    console.log('✅ Setting up realtime subscription for rundown:', rundownId);
    isSetupRef.current = true;

    // Create subscription
    const channel = supabase
      .channel(`rundown-collaboration-${rundownId}`)
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
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
          cleanup();
        }
      });

    subscriptionRef.current = channel;

    // Cleanup function
    return cleanup;
  }, [user?.id, rundownId, enabled, handleRealtimeUpdate, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
