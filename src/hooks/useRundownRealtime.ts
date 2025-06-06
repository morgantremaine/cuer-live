
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UseRundownRealtimeProps {
  currentRundownId?: string;
  currentUpdatedAt?: string;
  onRemoteUpdate: () => void;
  isUserEditing: boolean;
}

export const useRundownRealtime = ({
  currentRundownId,
  currentUpdatedAt,
  onRemoteUpdate,
  isUserEditing
}: UseRundownRealtimeProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const channelRef = useRef<any>(null);
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();

  const handleRealtimeUpdate = useCallback((payload: any) => {
    // Only process updates for the current rundown
    if (!currentRundownId || payload.new.id !== currentRundownId) {
      return;
    }

    // Don't process our own updates
    if (payload.new.user_id === user?.id) {
      return;
    }

    // Check if this is actually a newer update
    const remoteUpdatedAt = payload.new.updated_at;
    if (currentUpdatedAt && remoteUpdatedAt <= currentUpdatedAt) {
      return;
    }

    // Don't interrupt user while they're actively editing
    if (isUserEditing) {
      console.log('Delaying update - user is editing');
      return;
    }

    // Debounce multiple rapid updates
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    debounceTimeoutRef.current = setTimeout(() => {
      console.log('Applying remote rundown update');
      onRemoteUpdate();
      
      // Show a subtle notification
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });
    }, 500); // 500ms debounce
  }, [currentRundownId, currentUpdatedAt, user?.id, isUserEditing, onRemoteUpdate, toast]);

  useEffect(() => {
    if (!user || !currentRundownId) {
      return;
    }

    // Create a channel for rundown updates
    const channel = supabase
      .channel('rundown-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns'
        },
        handleRealtimeUpdate
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
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
