
import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useRealtimeDataSync } from './useRealtimeDataSync';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseEnhancedRealtimeCollaborationProps {
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
  onForceReload?: () => void;
  enabled?: boolean;
}

export const useEnhancedRealtimeCollaboration = ({
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
  onForceReload,
  enabled = true
}: UseEnhancedRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const lastProcessedUpdate = useRef<string>('');

  // Initialize data sync manager
  const {
    mergeRemoteChanges,
    trackPendingChange,
    clearPendingChanges,
    shouldAcceptUpdate,
    hasPendingChanges
  } = useRealtimeDataSync({
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
    currentUserId: user?.id
  });

  // Handle realtime updates with smart merging
  const handleRealtimeUpdate = useCallback((payload: any) => {
    console.log('📡 Enhanced realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: payload.new?.user_id,
      currentUserId: user?.id,
      timestamp: payload.commit_timestamp,
      isEditing
    });

    // Skip if not for current rundown
    if (!rundownId || payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // Skip if it's our own update
    if (payload.new?.user_id === user?.id) {
      console.log('⏭️ Skipping - our own update');
      return;
    }

    // Skip if we already processed this update
    const updateId = `${payload.commit_timestamp}-${payload.new?.updated_at}`;
    if (lastProcessedUpdate.current === updateId) {
      console.log('⏭️ Skipping - already processed');
      return;
    }

    // Check if we should accept this update
    if (!shouldAcceptUpdate(payload.commit_timestamp)) {
      console.log('⏭️ Skipping - older update');
      return;
    }

    lastProcessedUpdate.current = updateId;

    try {
      // Extract the updated data
      const remoteData = {
        items: payload.new?.items,
        columns: payload.new?.columns,
        title: payload.new?.title,
        timezone: payload.new?.timezone,
        startTime: payload.new?.start_time,
        updatedBy: payload.new?.user_id,
        timestamp: payload.commit_timestamp
      };

      // Use smart merge instead of force reload
      mergeRemoteChanges(remoteData);

      // Show subtle notification
      toast({
        title: 'Rundown Updated',
        description: 'Your teammate made changes to this rundown',
        duration: 3000,
      });

    } catch (error) {
      console.error('❌ Error processing realtime update:', error);
      
      // Fallback to force reload if merge fails
      if (onForceReload) {
        console.log('🔄 Falling back to force reload');
        onForceReload();
      }
    }
  }, [
    rundownId,
    user?.id,
    isEditing,
    shouldAcceptUpdate,
    mergeRemoteChanges,
    toast,
    onForceReload
  ]);

  // Setup and cleanup subscription
  useEffect(() => {
    if (!enabled || !user?.id || !rundownId) {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up realtime subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
      return;
    }

    console.log('✅ Setting up enhanced realtime collaboration for rundown:', rundownId);
    
    const channelId = `enhanced-rundown-${rundownId}`;
    
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
        console.log('📡 Enhanced subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Enhanced realtime collaboration active');
          isConnectedRef.current = true;
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to establish realtime connection');
          isConnectedRef.current = false;
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up enhanced realtime subscription');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        isConnectedRef.current = false;
      }
    };
  }, [enabled, user?.id, rundownId, handleRealtimeUpdate]);

  return {
    isConnected: isConnectedRef.current,
    trackPendingChange,
    clearPendingChanges,
    hasPendingChanges
  };
};
