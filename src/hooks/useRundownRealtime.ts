
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseRundownRealtimeProps {
  currentRundownId?: string;
  currentUpdatedAt?: string;
  onRemoteUpdate: () => void;
  isUserEditing: boolean;
  isSaving?: boolean; // Add this to prevent conflicts during saves
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

  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('Realtime update received:', payload);
    
    // Only process updates for the current rundown
    if (!currentRundownId || payload.new.id !== currentRundownId) {
      console.log('Ignoring update - not for current rundown');
      return;
    }

    // Don't process our own updates
    if (payload.new.user_id === user?.id) {
      console.log('Ignoring update - from current user');
      return;
    }

    // Don't process updates while we're saving to prevent conflicts
    if (isSaving) {
      console.log('Ignoring update - currently saving');
      return;
    }

    // Check if this is actually a newer update
    const remoteUpdatedAt = payload.new.updated_at;
    if (currentUpdatedAt && remoteUpdatedAt <= currentUpdatedAt) {
      console.log('Ignoring update - not newer than current');
      return;
    }

    // Prevent processing the same update multiple times
    if (lastProcessedUpdateRef.current === remoteUpdatedAt) {
      console.log('Ignoring update - already processed');
      return;
    }

    // Don't interrupt user while they're actively editing
    if (isUserEditing) {
      console.log('Delaying update - user is editing');
      return;
    }

    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // Debounce multiple rapid updates
    debounceTimeoutRef.current = setTimeout(() => {
      console.log('Applying remote rundown update');
      lastProcessedUpdateRef.current = remoteUpdatedAt;
      onRemoteUpdate();
      
      // Show a subtle notification
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });
    }, 500); // 500ms debounce
  }, [currentRundownId, currentUpdatedAt, user?.id, isUserEditing, isSaving, onRemoteUpdate, toast]);

  useEffect(() => {
    if (!user || !currentRundownId) {
      console.log('Not setting up realtime - no user or rundown ID');
      return;
    }

    console.log('Setting up realtime subscription for rundown:', currentRundownId);

    // Create a channel for rundown updates
    const channel = supabase
      .channel(`rundown-updates-${currentRundownId}`)
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
        console.log('Realtime subscription status:', status);
      });

    channelRef.current = channel;

    return () => {
      console.log('Cleaning up realtime subscription');
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
