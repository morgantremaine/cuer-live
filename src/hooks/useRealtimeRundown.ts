
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
    
    // Clean up old tracked updates after 30 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 30000);
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

    // RELAXED: Check if this is only a showcaller state update
    const currentContentHash = createContentHash(payload.new);
    const isShowcallerOnlyUpdate = currentContentHash === lastContentHashRef.current;

    console.log('📡 Realtime update analysis:', {
      isShowcallerOnly: isShowcallerOnlyUpdate,
      isEditing: isEditingRef.current,
      hasUnsavedChanges,
      isProcessing: isProcessingUpdate,
      fromUser: payload.new?.user_id
    });

    // RELAXED: Allow more showcaller updates through, only skip if actively editing
    if (isShowcallerOnlyUpdate && isEditingRef.current) {
      console.log('📺 Skipping showcaller-only update due to active editing');
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

    // CRITICAL: Set all processing flags FIRST
    stableSetIsProcessingUpdateRef.current(true);
    if (stableSetApplyingRemoteUpdateRef.current) {
      stableSetApplyingRemoteUpdateRef.current(true);
    }

    try {
      // SIMPLIFIED: Only show conflict dialog for content changes when user has unsaved changes
      if (hasUnsavedChanges && !isShowcallerOnlyUpdate) {
        // Use a more user-friendly approach - don't block the tab
        const shouldAcceptRemoteChanges = confirm(
          `Another team member updated this rundown.\n\n` +
          `You have unsaved changes that will be lost if you accept their update.\n\n` +
          `Accept their changes? (Your changes will be lost)`
        );
        
        if (!shouldAcceptRemoteChanges) {
          toast({
            title: 'Update Skipped',
            description: 'Your changes are preserved. Save soon to avoid conflicts.',
            duration: 3000,
          });
          return;
        }
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

      // Pre-update signature sync
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

      // Post-application signature sync
      if (stableUpdateSavedSignatureRef.current) {
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

      console.log('✅ Successfully applied realtime rundown update');

      // SIMPLIFIED: Don't show toast for showcaller-only updates
      if (!isShowcallerOnlyUpdate) {
        toast({
          title: 'Rundown Updated',
          description: 'Your teammate made changes to this rundown',
          duration: 3000,
        });
      }

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
      }, 200);
    }
  }, [rundownId, user?.id, hasUnsavedChanges, isProcessingUpdate, toast, createContentHash]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user) {
      return;
    }

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
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to rundown content updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to rundown content updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
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
