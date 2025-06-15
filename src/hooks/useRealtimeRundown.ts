
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
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const isEditingRef = useRef(false);
  const lastContentHashRef = useRef<string>('');
  const currentRundownIdRef = useRef<string | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const isInitializedRef = useRef(false);

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

  // Keep current values in refs
  currentRundownIdRef.current = rundownId;
  currentUserIdRef.current = user?.id || null;

  // Enhanced tracking of our own updates with timestamp-based detection
  const trackOwnUpdate = useCallback((timestamp: string) => {
    console.log('🏷️ Tracking own update with timestamp:', timestamp);
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
      console.log('🧹 Cleaned up tracked update:', timestamp);
    }, 10000);
  }, []);

  // Set editing state
  const setEditingState = useCallback((editing: boolean) => {
    isEditingRef.current = editing;
    console.log('✏️ Editing state changed:', editing);
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
    const updateTimestamp = payload.new?.updated_at;
    const currentUserId = currentUserIdRef.current;
    const currentRundownId = currentRundownIdRef.current;
    
    console.log('📡 Realtime update received:', {
      timestamp: updateTimestamp,
      rundownId: payload.new?.id,
      currentRundownId: currentRundownId,
      currentUserId: currentUserId,
      trackedUpdates: Array.from(ownUpdateTrackingRef.current)
    });
    
    // Skip if not for the current rundown
    if (payload.new?.id !== currentRundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // ONLY skip if this update timestamp is in our tracked updates (our own updates)
    if (updateTimestamp && ownUpdateTrackingRef.current.has(updateTimestamp)) {
      console.log('⏭️ Skipping - tracked as own update');
      return;
    }

    // Prevent processing duplicate updates
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping - duplicate timestamp');
      return;
    }

    // Check if this is only a showcaller state update
    const currentContentHash = createContentHash(payload.new);
    const isShowcallerOnlyUpdate = currentContentHash === lastContentHashRef.current;

    console.log('📡 Update analysis:', {
      isShowcallerOnly: isShowcallerOnlyUpdate,
      isEditing: isEditingRef.current,
      hasUnsavedChanges,
      isProcessing: isProcessingUpdate,
      contentHashMatch: currentContentHash === lastContentHashRef.current
    });

    // Allow showcaller updates through unless actively editing
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

    console.log('🔄 Processing remote update from teammate');

    // Set processing flags
    stableSetIsProcessingUpdateRef.current(true);
    if (stableSetApplyingRemoteUpdateRef.current) {
      stableSetApplyingRemoteUpdateRef.current(true);
    }

    try {
      // REMOVED: Manual save conflict dialogs since we have auto-save
      // No conflict resolution needed for auto-saved content

      console.log('🔄 Fetching updated rundown data');

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
        .eq('id', currentRundownId)
        .single();

      if (error) {
        console.error('Error fetching updated rundown:', error);
        throw error;
      }

      console.log('📦 Fetched rundown data:', data);

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

      console.log('🔄 Applying rundown update to state');

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

      // Apply the rundown update - this should trigger UI refresh
      stableOnRundownUpdatedRef.current(updatedRundown);

      console.log('✅ Successfully applied realtime rundown update');

      // Force a small delay to ensure state has propagated
      setTimeout(() => {
        if (stableUpdateSavedSignatureRef.current) {
          stableUpdateSavedSignatureRef.current(
            updatedRundown.items, 
            updatedRundown.title, 
            updatedRundown.columns, 
            updatedRundown.timezone, 
            updatedRundown.start_time
          );
        }
      }, 100);

    } catch (error) {
      console.error('Error processing realtime update:', error);
      
      toast({
        title: 'Sync Error',
        description: 'Failed to apply remote changes. Please refresh if issues persist.',
        variant: 'destructive',
        duration: 5000,
      });
    } finally {
      // Clear processing flags quickly for responsiveness
      setTimeout(() => {
        if (stableSetApplyingRemoteUpdateRef.current) {
          stableSetApplyingRemoteUpdateRef.current(false);
        }
        stableSetIsProcessingUpdateRef.current(false);
      }, 150);
    }
  }, [hasUnsavedChanges, isProcessingUpdate, toast, createContentHash]);

  // STABLE subscription management - avoid excessive cleanup/recreation
  useEffect(() => {
    const currentUserId = user?.id;
    const currentRundownId = rundownId;

    // Only set up subscription if we have required data and it's different from current
    if (!currentUserId || !currentRundownId) {
      console.log('⏸️ Skipping realtime setup - missing rundown ID or user');
      return;
    }

    // Don't recreate subscription if it's already for the same rundown
    if (subscriptionRef.current && isInitializedRef.current && 
        currentRundownIdRef.current === currentRundownId) {
      console.log('♻️ Keeping existing subscription for rundown:', currentRundownId);
      return;
    }

    // Clean up existing subscription only when necessary
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up realtime subscription on rundown change');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    console.log('✅ Setting up realtime subscription for rundown:', currentRundownId);

    const channel = supabase
      .channel(`rundown-content-${currentRundownId}-${currentUserId}`)
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
        console.log('📡 Realtime subscription status:', status, 'for rundown:', currentRundownId);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to rundown content updates');
          isInitializedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to rundown content updates');
          isInitializedRef.current = false;
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up realtime subscription on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isInitializedRef.current = false;
      }
    };
  }, [rundownId, user?.id]); // Minimal dependencies to avoid excessive re-creation

  return {
    isConnected: !!subscriptionRef.current,
    trackOwnUpdate,
    setEditingState
  };
};
