
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
  const lastOwnUpdateRef = useRef<string | null>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const isEditingRef = useRef(false);
  const lastContentHashRef = useRef<string>('');

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
    
    // Clean up old tracked updates after 15 seconds (reduced from 30)
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 15000);
  }, []);

  // Set editing state
  const setEditingState = useCallback((editing: boolean) => {
    isEditingRef.current = editing;
  }, []);

  // Create content hash to detect actual content changes
  const createContentHash = useCallback((data: any) => {
    if (!data) return '';
    const contentData = {
      items: data.items,
      title: data.title,
      columns: data.columns,
      timezone: data.timezone,
      start_time: data.start_time
    };
    return JSON.stringify(contentData);
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📡 Received realtime update:', {
      event: payload.eventType,
      updateTimestamp: payload.new?.updated_at,
      fromUserId: payload.new?.user_id,
      currentUserId: user?.id
    });

    // Enhanced checks to skip our own updates
    const updateTimestamp = payload.new?.updated_at;
    
    // Skip if this is our own tracked update
    if (updateTimestamp && (
        updateTimestamp === lastOwnUpdateRef.current ||
        ownUpdateTrackingRef.current.has(updateTimestamp)
    )) {
      console.log('⏭️ Skipping own realtime update');
      return;
    }
    
    // Skip if the user_id matches (if available)
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Skipping update from same user ID');
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping update for different rundown');
      return;
    }

    // Prevent processing duplicate updates
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate update');
      return;
    }

    // Check if this is only a showcaller state update
    const currentContentHash = createContentHash(payload.new);
    const isShowcallerOnlyUpdate = currentContentHash === lastContentHashRef.current;

    console.log('📡 Update analysis:', {
      isShowcallerOnly: isShowcallerOnlyUpdate,
      isEditing: isEditingRef.current,
      hasUnsavedChanges,
      isProcessing: isProcessingUpdate
    });

    // Allow showcaller updates through unless actively editing content
    if (isShowcallerOnlyUpdate && isEditingRef.current) {
      console.log('📺 Deferring showcaller update - user is editing');
      lastUpdateTimestampRef.current = updateTimestamp;
      return;
    }

    // Skip if currently processing
    if (isProcessingUpdate) {
      console.log('⏸️ Deferring update - processing in progress');
      return;
    }

    lastUpdateTimestampRef.current = updateTimestamp;
    lastContentHashRef.current = currentContentHash;

    // Set processing flags
    stableSetIsProcessingUpdateRef.current(true);
    if (stableSetApplyingRemoteUpdateRef.current) {
      stableSetApplyingRemoteUpdateRef.current(true);
    }

    try {
      // Handle conflict resolution for content changes
      if (hasUnsavedChanges && !isShowcallerOnlyUpdate) {
        console.log('⚠️ Conflict detected: user has unsaved changes');
        
        // Show a non-blocking notification instead of a blocking dialog
        toast({
          title: 'Team Update Received',
          description: 'A teammate made changes. Your changes will be preserved. Save soon to sync.',
          duration: 5000,
        });
        
        // For now, skip applying the remote update to preserve user's work
        // In the future, we could implement more sophisticated merging
        return;
      }

      console.log('🔄 Applying realtime rundown update');

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

      // Sync signature before applying update
      if (stableUpdateSavedSignatureRef.current) {
        stableUpdateSavedSignatureRef.current(
          updatedRundown.items, 
          updatedRundown.title, 
          updatedRundown.columns, 
          updatedRundown.timezone, 
          updatedRundown.start_time
        );
      }

      // Apply the rundown update
      stableOnRundownUpdatedRef.current(updatedRundown);

      console.log('✅ Successfully applied realtime rundown update');

    } catch (error) {
      console.error('Error processing realtime update:', error);
      
      toast({
        title: 'Sync Error',
        description: 'Failed to apply remote changes. Please refresh if issues persist.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // Quick recovery for better responsiveness
      setTimeout(() => {
        if (stableSetApplyingRemoteUpdateRef.current) {
          stableSetApplyingRemoteUpdateRef.current(false);
        }
        stableSetIsProcessingUpdateRef.current(false);
      }, 300);
    }
  }, [rundownId, user?.id, hasUnsavedChanges, isProcessingUpdate, toast, createContentHash]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up existing realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user) {
      return;
    }

    console.log('✅ Setting up realtime subscription for rundown:', rundownId);

    const channel = supabase
      .channel(`rundown-content-${rundownId}`)
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
          console.log('✅ Successfully subscribed to rundown content updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to rundown content updates');
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
  }, [rundownId, user, handleRealtimeUpdate]);

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate,
    setEditingState
  };
};
