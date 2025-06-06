
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseSimpleRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  enabled?: boolean;
}

export const useSimpleRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  enabled = true
}: UseSimpleRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  
  // Create stable handler that never changes
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Realtime update received:', {
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

    // Don't process our own updates
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Ignoring - our own update');
      return;
    }

    console.log('✅ Processing remote update from teammate');
    
    // Trigger the callback to show notification
    onRemoteUpdate();
    
    // Show notification
    toast({
      title: 'Rundown Updated',
      description: 'Your teammate made changes to this rundown. Click refresh to see the latest version.',
      duration: 5000,
    });
  }, [rundownId, user?.id, onRemoteUpdate, toast]);

  // Simple cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
    }
  }, []);

  // Setup subscription when rundown changes
  useEffect(() => {
    if (!enabled || !user?.id || !rundownId) {
      cleanup();
      return;
    }

    console.log('🔄 Setting up realtime subscription for rundown:', rundownId);
    
    // Cleanup existing
    cleanup();
    
    // Setup new subscription
    const channelId = `rundown-collaboration-${rundownId}`;
    
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
        }
      });

    subscriptionRef.current = channel;

    return cleanup;
  }, [user?.id, rundownId, enabled, handleRealtimeUpdate, cleanup]);

  return {
    isConnected: isConnectedRef.current
  };
};
