import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseStableRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  onReloadCurrentRundown?: () => void;
  enabled?: boolean;
}

export const useStableRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  onReloadCurrentRundown,
  enabled = true
}: UseStableRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use refs to store ALL values and prevent ANY re-renders
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const currentRundownIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onReloadCurrentRundownRef = useRef(onReloadCurrentRundown);
  const enabledRef = useRef(enabled);
  const lastSetupRundownId = useRef<string | null>(null);
  const lastSetupUserId = useRef<string | null>(null);
  
  // Keep refs updated but NEVER trigger effects
  currentRundownIdRef.current = rundownId;
  userIdRef.current = user?.id || null;
  onRemoteUpdateRef.current = onRemoteUpdate;
  onReloadCurrentRundownRef.current = onReloadCurrentRundown;
  enabledRef.current = enabled;

  // Create stable cleanup function that never changes
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up stable realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      lastSetupRundownId.current = null;
      lastSetupUserId.current = null;
    }
  }, []);

  // Create stable handler that never changes
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const currentUserId = userIdRef.current;
    const currentRundownId = currentRundownIdRef.current;
    const updateUserId = payload.new?.user_id;
    
    console.log('📡 Stable realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: updateUserId,
      currentUserId: currentUserId,
      timestamp: payload.commit_timestamp,
      isOwnUpdate: updateUserId === currentUserId
    });

    // Only process updates for the current rundown
    if (!currentRundownId || payload.new?.id !== currentRundownId) {
      console.log('⏭️ Stable - ignoring wrong rundown');
      return;
    }

    // Don't process our own updates - improved detection
    if (updateUserId && updateUserId === currentUserId) {
      console.log('⏭️ Stable - ignoring own update (user ID match)');
      return;
    }

    console.log('✅ Stable - processing remote update from teammate');
    
    // Trigger remote update callback immediately
    try {
      onRemoteUpdateRef.current();
    } catch (error) {
      console.error('Error in onRemoteUpdate callback:', error);
    }
    
    // Reload current rundown data after a short delay to show changes
    if (onReloadCurrentRundownRef.current) {
      setTimeout(() => {
        console.log('🔄 Stable - reloading current rundown data');
        try {
          onReloadCurrentRundownRef.current?.();
        } catch (error) {
          console.error('Error in onReloadCurrentRundown callback:', error);
        }
      }, 100); // Slightly increased delay for better reliability
    }
  }, []);

  // Separate effect to handle rundown changes - prevent unnecessary re-subscriptions
  useEffect(() => {
    const currentUserId = user?.id;
    const currentRundownId = rundownId;
    const currentEnabled = enabled;

    // Only setup if we have all required data and it's different from what we have
    if (currentEnabled && currentUserId && currentRundownId && 
        (lastSetupRundownId.current !== currentRundownId || lastSetupUserId.current !== currentUserId)) {
      
      console.log('🔄 Stable - setting up new subscription for rundown:', currentRundownId, 'user:', currentUserId);
      
      // Cleanup existing
      cleanup();
      
      // Setup new subscription with unique channel per user
      const channelId = `stable-collaboration-${currentRundownId}-${currentUserId}`;
      
      const channel = supabase
        .channel(channelId)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rundowns',
            filter: `id=eq.${currentRundownId}`
          },
          handleRealtimeUpdate
        )
        .subscribe((status) => {
          console.log('📡 Stable subscription status:', status, 'for rundown:', currentRundownId);
          if (status === 'SUBSCRIBED') {
            console.log('✅ Stable - successfully subscribed to realtime updates');
            isConnectedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            console.error('❌ Stable - failed to subscribe to realtime updates');
            cleanup();
          }
        });

      subscriptionRef.current = channel;
      lastSetupRundownId.current = currentRundownId;
      lastSetupUserId.current = currentUserId;
    } else if (!currentEnabled || !currentUserId || !currentRundownId) {
      cleanup();
    }

    return cleanup;
  }, [user?.id, rundownId, enabled, handleRealtimeUpdate, cleanup]);

  return {
    isConnected: isConnectedRef.current
  };
};
