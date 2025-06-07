
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { SavedRundown } from './useRundownStorage/types';

interface UseRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdated: (rundown: SavedRundown) => void;
  hasUnsavedChanges: boolean;
  isProcessingUpdate: boolean;
  setIsProcessingUpdate: (processing: boolean) => void;
}

export const useRealtimeRundown = ({
  rundownId,
  onRundownUpdated,
  hasUnsavedChanges,
  isProcessingUpdate,
  setIsProcessingUpdate
}: UseRealtimeRundownProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📡 Realtime update received:', payload);
    
    // Skip our own updates
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Skipping own update');
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // Prevent processing duplicate updates
    const updateTimestamp = payload.new?.updated_at;
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate update');
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    setIsProcessingUpdate(true);

    try {
      // If user has unsaved changes, show conflict resolution
      if (hasUnsavedChanges) {
        const shouldAcceptRemoteChanges = window.confirm(
          'Another team member has updated this rundown. You have unsaved changes. Do you want to accept their changes? (Your changes will be lost)'
        );
        
        if (!shouldAcceptRemoteChanges) {
          console.log('👤 User chose to keep local changes');
          setIsProcessingUpdate(false);
          return;
        }
      }

      // Fetch the complete updated rundown data
      const { data, error } = await supabase
        .from('rundowns')
        .select(`
          *,
          teams:team_id (
            id,
            name
          )
        `)
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('Error fetching updated rundown:', error);
        throw error;
      }

      // Transform the data to match our expected format
      const updatedRundown: SavedRundown = {
        id: data.id,
        user_id: data.user_id,
        title: data.title,
        items: Array.isArray(data.items) ? data.items : [],
        columns: data.columns,
        timezone: data.timezone,
        start_time: data.start_time,
        team_id: data.team_id,
        teams: data.teams ? {
          id: data.teams.id,
          name: data.teams.name
        } : null,
        created_at: data.created_at,
        updated_at: data.updated_at,
        archived: data.archived,
        undo_history: data.undo_history
      };

      console.log('✅ Applying remote update');
      onRundownUpdated(updatedRundown);

      // Show notification
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

    } catch (error) {
      console.error('Error processing realtime update:', error);
      toast({
        title: 'Update Error',
        description: 'Failed to apply remote changes',
        variant: 'destructive',
        duration: 3000,
      });
    } finally {
      setIsProcessingUpdate(false);
    }
  }, [rundownId, user?.id, hasUnsavedChanges, onRundownUpdated, setIsProcessingUpdate, toast]);

  useEffect(() => {
    if (!rundownId || !user) {
      // Cleanup existing subscription
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up realtime subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      return;
    }

    // Don't subscribe while processing an update to prevent loops
    if (isProcessingUpdate) {
      return;
    }

    // Cleanup existing subscription before creating new one
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    console.log('✅ Setting up realtime subscription for rundown:', rundownId);

    const channel = supabase
      .channel(`rundown-${rundownId}`)
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
        console.log('📡 Realtime subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up realtime subscription on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, isProcessingUpdate, handleRealtimeUpdate]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
