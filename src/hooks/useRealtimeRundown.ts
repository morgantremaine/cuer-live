
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
  updateSavedSignature?: (items: any[], title: string, columns?: any[], timezone?: string, startTime?: string) => void;
}

export const useRealtimeRundown = ({
  rundownId,
  onRundownUpdated,
  hasUnsavedChanges,
  isProcessingUpdate,
  setIsProcessingUpdate,
  updateSavedSignature
}: UseRealtimeRundownProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastOwnUpdateRef = useRef<string | null>(null);

  // Stable refs to prevent infinite loops
  const stableOnRundownUpdatedRef = useRef(onRundownUpdated);
  const stableSetIsProcessingUpdateRef = useRef(setIsProcessingUpdate);
  const stableUpdateSavedSignatureRef = useRef(updateSavedSignature);
  
  // Update refs when functions change
  stableOnRundownUpdatedRef.current = onRundownUpdated;
  stableSetIsProcessingUpdateRef.current = setIsProcessingUpdate;
  stableUpdateSavedSignatureRef.current = updateSavedSignature;

  // Track when we make updates to avoid processing our own changes
  const trackOwnUpdate = useCallback((timestamp: string) => {
    lastOwnUpdateRef.current = timestamp;
    console.log('🔖 Tracking own update:', timestamp);
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📡 Realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: payload.new?.user_id,
      currentUserId: user?.id,
      timestamp: payload.new?.updated_at,
      commitTimestamp: payload.commit_timestamp
    });
    
    // Multiple checks to skip our own updates
    const updateTimestamp = payload.new?.updated_at;
    
    // Skip if this is our own tracked update
    if (updateTimestamp && updateTimestamp === lastOwnUpdateRef.current) {
      console.log('⏭️ Skipping own tracked update');
      return;
    }
    
    // Skip if the user_id matches (if available)
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Skipping own update - user ID match');
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // Prevent processing duplicate updates
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate update');
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    // Additional safety check - if we're currently processing an update, skip
    if (isProcessingUpdate) {
      console.log('⏭️ Skipping - already processing an update');
      return;
    }

    console.log('✅ Processing remote update from teammate');
    stableSetIsProcessingUpdateRef.current(true);

    try {
      // Enhanced conflict resolution with better UX
      if (hasUnsavedChanges) {
        const result = await new Promise<boolean>((resolve) => {
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
          stableSetIsProcessingUpdateRef.current(false);
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

      console.log('✅ Applying remote update from teammate');
      
      // Update the saved signature BEFORE applying the rundown update
      // This prevents change tracking from triggering
      if (stableUpdateSavedSignatureRef.current) {
        stableUpdateSavedSignatureRef.current(
          updatedRundown.items, 
          updatedRundown.title, 
          updatedRundown.columns, 
          updatedRundown.timezone, 
          updatedRundown.start_time
        );
      }
      
      stableOnRundownUpdatedRef.current(updatedRundown);

      // Show success notification - only for remote updates
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

      // Reset retry count on successful update
      retryCountRef.current = 0;

    } catch (error) {
      console.error('Error processing realtime update:', error);
      
      retryCountRef.current++;
      const maxRetries = 3;
      
      if (retryCountRef.current <= maxRetries) {
        toast({
          title: 'Sync Error',
          description: `Failed to apply remote changes. Retrying... (${retryCountRef.current}/${maxRetries})`,
          variant: 'destructive',
          duration: 3000,
        });
      } else {
        toast({
          title: 'Sync Failed',
          description: 'Unable to apply remote changes. Please refresh the page.',
          variant: 'destructive',
          duration: 8000,
        });
      }
    } finally {
      stableSetIsProcessingUpdateRef.current(false);
    }
  }, [rundownId, user?.id, hasUnsavedChanges, isProcessingUpdate, toast]);

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

    // Only set up subscription if we have the required data and not processing
    if (!rundownId || !user || isProcessingUpdate) {
      return;
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
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
        } else if (status === 'CLOSED') {
          console.log('📡 Realtime subscription closed');
        }
      });

    subscriptionRef.current = channel;

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
  }, [rundownId, user, isProcessingUpdate, handleRealtimeUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate
  };
};
