
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);

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
      // Enhanced conflict resolution with better UX
      if (hasUnsavedChanges) {
        const result = await new Promise<boolean>((resolve) => {
          // Show a more user-friendly conflict dialog
          const shouldAcceptRemoteChanges = window.confirm(
            `🔄 Another team member just updated this rundown.\n\n` +
            `You have unsaved changes that will be lost if you accept their update.\n\n` +
            `Would you like to:\n` +
            `• "OK" - Accept their changes (your changes will be lost)\n` +
            `• "Cancel" - Keep your changes (you'll miss their update)`
          );
          resolve(shouldAcceptRemoteChanges);
        });
        
        if (!result) {
          console.log('👤 User chose to keep local changes');
          toast({
            title: 'Update Skipped',
            description: 'Your changes are preserved. Save soon to avoid conflicts.',
            duration: 5000,
          });
          setIsProcessingUpdate(false);
          return;
        }
      }

      // Show loading state for better UX
      toast({
        title: 'Syncing Changes',
        description: 'Applying updates from your teammate...',
        duration: 2000,
      });

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

      // Show success notification with team member info
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

      // Reset retry count on successful update
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Error processing realtime update:', error);
      
      // Enhanced error handling with retry logic
      retryCountRef.current++;
      const maxRetries = 3;
      
      if (retryCountRef.current <= maxRetries) {
        toast({
          title: 'Sync Error',
          description: `Failed to apply remote changes. Retrying... (${retryCountRef.current}/${maxRetries})`,
          variant: 'destructive',
          duration: 3000,
        });
        
        // Retry after a short delay
        setTimeout(() => {
          handleRealtimeUpdate(payload);
        }, 2000 * retryCountRef.current); // Exponential backoff
      } else {
        toast({
          title: 'Sync Failed',
          description: 'Unable to apply remote changes. Please refresh the page.',
          variant: 'destructive',
          duration: 8000,
        });
      }
    } finally {
      setIsProcessingUpdate(false);
    }
  }, [rundownId, user?.id, hasUnsavedChanges, onRundownUpdated, setIsProcessingUpdate, toast]);

  const setupSubscription = useCallback(() => {
    if (!rundownId || !user || isProcessingUpdate) {
      return null;
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
        
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0; // Reset retry count on successful connection
          toast({
            title: 'Connected',
            description: 'Real-time collaboration is active',
            duration: 2000,
          });
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
          
          // Implement exponential backoff for reconnection
          if (retryCountRef.current < 5) {
            const delay = Math.min(1000 * Math.pow(2, retryCountRef.current), 30000);
            retryCountRef.current++;
            
            reconnectTimeoutRef.current = setTimeout(() => {
              console.log(`🔄 Attempting to reconnect... (attempt ${retryCountRef.current})`);
              setupSubscription();
            }, delay);
          } else {
            toast({
              title: 'Connection Issues',
              description: 'Unable to connect for real-time updates. Changes from teammates may not appear automatically.',
              variant: 'destructive',
              duration: 8000,
            });
          }
        } else if (status === 'CLOSED') {
          console.log('📡 Realtime subscription closed');
        }
      });

    return channel;
  }, [rundownId, user, isProcessingUpdate, handleRealtimeUpdate, toast]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up existing realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Clear any pending reconnection attempts
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Set up new subscription if we have the required data
    if (rundownId && user && !isProcessingUpdate) {
      subscriptionRef.current = setupSubscription();
    }

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up realtime subscription on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [rundownId, user, isProcessingUpdate, setupSubscription]);

  return {
    isConnected: !!subscriptionRef.current
  };
};
