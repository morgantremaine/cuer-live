
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseRundownRealtimeProps {
  currentRundownId?: string;
  currentUpdatedAt?: string;
  onRemoteUpdate: () => void;
  isUserEditing: boolean;
  isSaving?: boolean;
}

export const useRundownRealtime = ({
  currentRundownId,
  currentUpdatedAt,
  onRemoteUpdate,
  isUserEditing,
  isSaving = false
}: UseRundownRealtimeProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const lastProcessedUpdateRef = useRef<string>('');
  const isSubscribedRef = useRef(false);

  console.log('🔴 useRundownRealtime hook called with:', {
    currentRundownId,
    hasUser: !!user,
    userEmail: user?.email,
    userId: user?.id,
    isUserEditing,
    isSaving
  });

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Realtime update received:', {
      rundownId: payload.new.id,
      updatedByUserId: payload.new.user_id,
      currentUserId: user?.id,
      isCurrentRundown: payload.new.id === currentRundownId,
      payloadData: payload.new
    });
    
    // Only process updates for the current rundown
    if (!currentRundownId || payload.new.id !== currentRundownId) {
      console.log('⏭️ Ignoring update - not for current rundown');
      return;
    }

    // CRITICAL: Don't process our own updates - use strict comparison with user ID
    if (payload.new.user_id === user?.id) {
      console.log('⏭️ Ignoring update - from current user:', {
        payloadUserId: payload.new.user_id,
        currentUserId: user?.id,
        areEqual: payload.new.user_id === user?.id
      });
      return;
    }

    // Check if this is actually a newer update
    const remoteUpdatedAt = payload.new.updated_at;
    if (currentUpdatedAt && remoteUpdatedAt <= currentUpdatedAt) {
      console.log('⏭️ Ignoring update - not newer than current');
      return;
    }

    // Prevent processing the same update multiple times
    if (lastProcessedUpdateRef.current === remoteUpdatedAt) {
      console.log('⏭️ Ignoring update - already processed');
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // If user is editing, delay the update but still apply it
    const delay = isUserEditing ? 2000 : 500;
    console.log(`⏰ Scheduling remote update in ${delay}ms (user editing: ${isUserEditing})`);

    // Debounce multiple rapid updates
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('✅ Applying remote rundown update from teammate');
      lastProcessedUpdateRef.current = remoteUpdatedAt;
      onRemoteUpdate();
      
      // Show a subtle notification - this should only show to users who didn't make the change
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });
    }, delay);
  }, [currentRundownId, currentUpdatedAt, user?.id, isUserEditing, onRemoteUpdate, toast]);

  // Set up realtime subscription
  useEffect(() => {
    console.log('🔴 useRundownRealtime effect triggered', {
      hasUser: !!user,
      userId: user?.id,
      currentRundownId,
      userEmail: user?.email,
      isSubscribed: isSubscribedRef.current
    });

    // Don't set up if we don't have the required data
    if (!user?.id || !currentRundownId) {
      console.log('❌ Not setting up realtime - missing user ID or rundown ID');
      return;
    }

    // Prevent duplicate subscriptions
    if (isSubscribedRef.current) {
      console.log('⏭️ Realtime already set up, skipping');
      return;
    }

    console.log('✅ Setting up realtime subscription for rundowns');
    isSubscribedRef.current = true;

    // Create a unique channel name
    const channelName = `rundown-updates-${currentRundownId}-${Date.now()}`;
    
    // Create a channel for rundown updates
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns'
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status, 'for channel:', channelName);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
          isSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up realtime subscription');
      isSubscribedRef.current = false;
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [user?.id, currentRundownId, handleRealtimeUpdate]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);
};
