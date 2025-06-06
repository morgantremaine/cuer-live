
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useOptimisticUpdates } from './useOptimisticUpdates';
import { useChangeTracking } from './useChangeTracking';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseAdvancedRealtimeCollaborationProps {
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

export const useAdvancedRealtimeCollaboration = ({
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
}: UseAdvancedRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const lastProcessedUpdate = useRef<string>('');

  // Use our new hooks
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
            remoteModifiedBy: 'Teammate', // We'll enhance this with actual user data later
            localTimestamp: Date.now(),
            remoteTimestamp: Date.now()
          });
        }
      });
    });

    return conflicts;
  }, [pendingUpdates, user?.email]);

  // Enhanced merge function with conflict detection
  const mergeRemoteChanges = useCallback((payload: any) => {
    console.log('🔄 Advanced merge with conflict detection');

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

          // Don't merge automatically if there are conflicts
          return;
        }

        // No conflicts, proceed with merge
        setItems(currentItems => {
          const changes = detectChanges(remoteData.items, remoteData.updatedBy);
          
          // Track changes for granular notifications
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

          // Update last known state
          updateLastKnownState(remoteData.items);

          return remoteData.items;
        });

        // Confirm any pending optimistic updates that match
        pendingUpdates.forEach(update => {
          const remoteItem = remoteData.items.find((item: RundownItem) => item.id === update.itemId);
          if (remoteItem && remoteItem[update.field] === update.value) {
            confirmOptimisticUpdate(update.id);
          }
        });
      }

      // Update other fields if not currently being edited
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

      // Update columns
      if (remoteData.columns && Array.isArray(remoteData.columns)) {
        handleLoadLayout(remoteData.columns);
      }

      // Show granular notification
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Error in advanced merge:', error);
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
    onConflictDetected
  ]);

  // Handle realtime updates
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Advanced realtime update received');

    // Skip if not for current rundown or our own update
    if (!rundownId || payload.new?.id !== rundownId || payload.new?.user_id === user?.id) {
      return;
    }

    // Skip if already processed
    const updateId = `${payload.commit_timestamp}-${payload.new?.updated_at}`;
    if (lastProcessedUpdate.current === updateId) {
      return;
    }

    lastProcessedUpdate.current = updateId;
    mergeRemoteChanges(payload);
  }, [rundownId, user?.id, mergeRemoteChanges]);

  // Setup subscription
  useEffect(() => {
    if (!enabled || !user?.id || !rundownId) {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
      return;
    }

    console.log('✅ Setting up advanced realtime collaboration');
    
    const channelId = `advanced-rundown-${rundownId}`;
    
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
        console.log('📡 Advanced subscription status:', status);
        isConnectedRef.current = status === 'SUBSCRIBED';
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [enabled, user?.id, rundownId, handleRealtimeUpdate]);

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
