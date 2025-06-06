
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseStableAdvancedRealtimeCollaborationProps {
  rundownId: string | null;
  items: RundownItem[];
  setItems: (updater: (prev: RundownItem[]) => RundownItem[]) => void;
  columns: Column[];
  handleLoadLayout: (columns: Column[]) => void;
  rundownTitle: string;
  setRundownTitleDirectly: (title: string) => void;
  timezone: string;
  setTimezoneDirectly: (timezone: string) => void;
  rundownStartTime: string;
  setRundownStartTimeDirectly: (time: string) => void;
  isEditing: boolean;
  onConflictDetected?: (conflicts: any[]) => void;
  enabled?: boolean;
}

export const useStableAdvancedRealtimeCollaboration = ({
  rundownId,
  items,
  setItems,
  columns,
  handleLoadLayout,
  rundownTitle,
  setRundownTitleDirectly,
  timezone,
  setTimezoneDirectly,
  rundownStartTime,
  setRundownStartTimeDirectly,
  isEditing,
  onConflictDetected,
  enabled = true
}: UseStableAdvancedRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const lastProcessedUpdate = useRef<string>('');
  const currentRundownIdRef = useRef<string | null>(null);
  const setupInProgressRef = useRef(false);

  // Use our hooks with stable references
  const {
    pendingUpdates,
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    applyOptimisticUpdates,
    clearAllOptimisticUpdates,
    hasPendingUpdates
  } = useOptimisticUpdates();

  const {
    trackChange,
    detectChanges,
    getChangeHistory,
    updateLastKnownState
  } = useChangeTracking();

  // Conflict detection state
  const [detectedConflicts, setDetectedConflicts] = useState<any[]>([]);

  // Apply optimistic updates to items before rendering
  const optimisticItems = applyOptimisticUpdates(items);

  // Stable cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up stable advanced realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      currentRundownIdRef.current = null;
      setupInProgressRef.current = false;
    }
  }, []);

  // Enhanced conflict detection
  const detectConflicts = useCallback((remoteItems: RundownItem[], localItems: RundownItem[]) => {
    const conflicts: any[] = [];

    remoteItems.forEach(remoteItem => {
      const localItem = localItems.find(item => item.id === remoteItem.id);
      if (!localItem) return;

      // Check each field for conflicts
      Object.keys(remoteItem).forEach(field => {
        if (field === 'id') return;

        const remoteValue = String(remoteItem[field as keyof RundownItem] || '');
        const localValue = String(localItem[field as keyof RundownItem] || '');

        // Check if there's a pending optimistic update for this field
        const hasPendingUpdate = pendingUpdates.some(
          update => update.itemId === remoteItem.id && update.field === field
        );

        if (hasPendingUpdate && remoteValue !== localValue) {
          conflicts.push({
            itemId: remoteItem.id,
            field,
            localValue,
            remoteValue,
            localModifiedBy: user?.email,
            remoteModifiedBy: 'Teammate',
            localTimestamp: Date.now(),
            remoteTimestamp: Date.now()
          });
        }
      });
    });

    return conflicts;
  }, [pendingUpdates, user?.email]);

  // Stable realtime update handler
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Stable advanced realtime update received');

    // Skip if not for current rundown or our own update
    if (!currentRundownIdRef.current || 
        payload.new?.id !== currentRundownIdRef.current || 
        payload.new?.user_id === user?.id) {
      return;
    }

    // Skip if already processed
    const updateId = `${payload.commit_timestamp}-${payload.new?.updated_at}`;
    if (lastProcessedUpdate.current === updateId) {
      return;
    }

    lastProcessedUpdate.current = updateId;

    const remoteData = {
      items: payload.new?.items,
      columns: payload.new?.columns,
      title: payload.new?.title,
      timezone: payload.new?.timezone,
      startTime: payload.new?.start_time,
      updatedBy: payload.new?.user_id,
      timestamp: payload.commit_timestamp
    };

    try {
      // Detect conflicts before merging
      if (remoteData.items && Array.isArray(remoteData.items)) {
        const conflicts = detectConflicts(remoteData.items, items);
        
        if (conflicts.length > 0) {
          console.log('⚠️ Conflicts detected:', conflicts);
          setDetectedConflicts(conflicts);
          
          if (onConflictDetected) {
            onConflictDetected(conflicts);
          }
          return;
        }

        // No conflicts, proceed with merge
        setItems(() => {
          const changes = detectChanges(remoteData.items, remoteData.updatedBy);
          
          // Track changes
          changes.forEach(change => {
            change.changes.forEach(fieldChange => {
              trackChange(
                change.itemId,
                fieldChange.field,
                fieldChange.oldValue,
                fieldChange.newValue,
                remoteData.updatedBy
              );
            });
          });

          updateLastKnownState(remoteData.items);
          return remoteData.items;
        });

        // Confirm matching optimistic updates
        pendingUpdates.forEach(update => {
          const remoteItem = remoteData.items.find((item: RundownItem) => item.id === update.itemId);
          if (remoteItem && remoteItem[update.field] === update.value) {
            confirmOptimisticUpdate(update.id);
          }
        });
      }

      // Update other fields if not editing
      if (!isEditing) {
        if (remoteData.title && remoteData.title !== rundownTitle) {
          setRundownTitleDirectly(remoteData.title);
        }
        
        if (remoteData.timezone && remoteData.timezone !== timezone) {
          setTimezoneDirectly(remoteData.timezone);
        }
        
        if (remoteData.startTime && remoteData.startTime !== rundownStartTime) {
          setRundownStartTimeDirectly(remoteData.startTime);
        }
      }

      if (remoteData.columns && Array.isArray(remoteData.columns)) {
        handleLoadLayout(remoteData.columns);
      }

      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Error in stable advanced merge:', error);
    }
  }, [
    items,
    detectConflicts,
    setItems,
    detectChanges,
    trackChange,
    updateLastKnownState,
    pendingUpdates,
    confirmOptimisticUpdate,
    isEditing,
    rundownTitle,
    setRundownTitleDirectly,
    timezone,
    setTimezoneDirectly,
    rundownStartTime,
    setRundownStartTimeDirectly,
    handleLoadLayout,
    toast,
    onConflictDetected,
    user?.id
  ]);

  // Main effect that handles subscription setup/cleanup
  useEffect(() => {
    // Only proceed if we have all required data and it's enabled
    if (!enabled || !user?.id || !rundownId) {
      cleanup();
      return;
    }

    // Skip if already set up for this rundown or setup is in progress
    if (currentRundownIdRef.current === rundownId && subscriptionRef.current) {
      console.log('📋 Already subscribed to this rundown, skipping setup');
      return;
    }

    // Prevent multiple simultaneous setups
    if (setupInProgressRef.current) {
      console.log('🔄 Setup already in progress, skipping');
      return;
    }

    setupInProgressRef.current = true;

    // Clean up any existing subscription
    cleanup();

    console.log('✅ Setting up stable advanced realtime collaboration for:', rundownId);
    
    // Update current rundown reference
    currentRundownIdRef.current = rundownId;
    
    const channelId = `stable-advanced-rundown-${rundownId}`;
    
    const channel = supabase
      .channel(channelId)
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
        console.log('📡 Stable advanced subscription status:', status);
        if (status === 'SUBSCRIBED') {
          isConnectedRef.current = true;
          setupInProgressRef.current = false;
          console.log('✅ Stable advanced realtime collaboration active');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to establish stable advanced realtime connection');
          isConnectedRef.current = false;
          setupInProgressRef.current = false;
          cleanup();
        }
      });

    subscriptionRef.current = channel;

    // Cleanup function
    return () => {
      setupInProgressRef.current = false;
      cleanup();
    };
  }, [enabled, user?.id, rundownId, handleRealtimeUpdate, cleanup]);

  return {
    isConnected: isConnectedRef.current,
    hasPendingChanges: hasPendingUpdates,
    optimisticItems,
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    clearAllOptimisticUpdates,
    detectChanges,
    getChangeHistory,
    detectedConflicts,
    setDetectedConflicts
  };
};
