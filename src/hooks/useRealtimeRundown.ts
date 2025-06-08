
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
  setApplyingRemoteUpdate?: (applying: boolean) => void;
}

export const useRealtimeRundown = ({
  rundownId,
  onRundownUpdated,
  hasUnsavedChanges,
  isProcessingUpdate,
  setIsProcessingUpdate,
  updateSavedSignature,
  setApplyingRemoteUpdate
}: UseRealtimeRundownProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastOwnUpdateRef = useRef<string | null>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());

  // Stable refs to prevent infinite loops
  const stableOnRundownUpdatedRef = useRef(onRundownUpdated);
  const stableSetIsProcessingUpdateRef = useRef(setIsProcessingUpdate);
  const stableUpdateSavedSignatureRef = useRef(updateSavedSignature);
  const stableSetApplyingRemoteUpdateRef = useRef(setApplyingRemoteUpdate);
  
  // Update refs when functions change
  stableOnRundownUpdatedRef.current = onRundownUpdated;
  stableSetIsProcessingUpdateRef.current = setIsProcessingUpdate;
  stableUpdateSavedSignatureRef.current = updateSavedSignature;
  stableSetApplyingRemoteUpdateRef.current = setApplyingRemoteUpdate;

  // Enhanced tracking of our own updates
  const trackOwnUpdate = useCallback((timestamp: string) => {
    lastOwnUpdateRef.current = timestamp;
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 30 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 30000);
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    // Enhanced checks to skip our own updates
    const updateTimestamp = payload.new?.updated_at;
    
    // Skip if this is our own tracked update
    if (updateTimestamp && (
        updateTimestamp === lastOwnUpdateRef.current ||
        ownUpdateTrackingRef.current.has(updateTimestamp)
    )) {
      return;
    }
    
    // Skip if the user_id matches (if available)
    if (payload.new?.user_id === user?.id) {
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    // Prevent processing duplicate updates
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    // Additional safety check - if we're currently processing an update, skip
    if (isProcessingUpdate) {
      return;
    }

    // IMPROVED: Better handling of showcaller vs content updates
    const isShowcallerOnlyUpdate = payload.new?.showcaller_state !== undefined && 
      payload.old && payload.new.items === payload.old.items && 
      payload.new.title === payload.old.title && 
      payload.new.columns === payload.old.columns;

    // CRITICAL: Set all processing flags FIRST with enhanced coordination
    stableSetIsProcessingUpdateRef.current(true);
    if (stableSetApplyingRemoteUpdateRef.current) {
      stableSetApplyingRemoteUpdateRef.current(true);
    }

    try {
      // Enhanced conflict resolution - but be more permissive for content changes
      if (hasUnsavedChanges && !isShowcallerOnlyUpdate) {
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
          toast({
            title: 'Update Skipped',
            description: 'Your changes are preserved. Save soon to avoid conflicts.',
            duration: 5000,
          });
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

      // IMPROVED: Only update signature for content changes, not showcaller-only updates
      if (stableUpdateSavedSignatureRef.current && !isShowcallerOnlyUpdate) {
        // Use setTimeout to ensure this happens before any change detection
        setTimeout(() => {
          stableUpdateSavedSignatureRef.current?.(
            updatedRundown.items, 
            updatedRundown.title, 
            updatedRundown.columns, 
            updatedRundown.timezone, 
            updatedRundown.start_time
          );
        }, 0);
      }

      // Apply the rundown update
      stableOnRundownUpdatedRef.current(updatedRundown);

      // IMPROVED: Post-application signature sync - only for content changes
      if (stableUpdateSavedSignatureRef.current && !isShowcallerOnlyUpdate) {
        setTimeout(() => {
          stableUpdateSavedSignatureRef.current?.(
            updatedRundown.items, 
            updatedRundown.title, 
            updatedRundown.columns, 
            updatedRundown.timezone, 
            updatedRundown.start_time
          );
        }, 100);
      }

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
      // IMPROVED: Faster recovery for better responsiveness
      setTimeout(() => {
        if (stableSetApplyingRemoteUpdateRef.current) {
          stableSetApplyingRemoteUpdateRef.current(false);
        }
        stableSetIsProcessingUpdateRef.current(false);
      }, 500); // Reduced delay for better responsiveness
    }
  }, [rundownId, user?.id, hasUnsavedChanges, isProcessingUpdate, toast]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
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
        if (status === 'SUBSCRIBED') {
          retryCountRef.current = 0;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to realtime updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
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
