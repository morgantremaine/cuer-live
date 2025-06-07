
import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { Column } from './useColumnsManager';

interface UseRealtimeRundownSyncProps {
  rundownId: string | null;
  currentUserId: string | null;
  setItems: (items: RundownItem[]) => void;
  setRundownTitle: (title: string) => void;
  setTimezone: (timezone: string) => void;
  setRundownStartTime: (startTime: string) => void;
  handleLoadLayout: (columns: Column[]) => void;
  markAsChanged: () => void;
}

export const useRealtimeRundownSync = ({
  rundownId,
  currentUserId,
  setItems,
  setRundownTitle,
  setTimezone,
  setRundownStartTime,
  handleLoadLayout,
  markAsChanged
}: UseRealtimeRundownSyncProps) => {
  const channelRef = useRef<any>(null);
  const lastUpdateRef = useRef<number>(Date.now());
  const [updateTrigger, setUpdateTrigger] = useState(0);

  const handleRundownUpdate = useCallback((payload: any) => {
    console.log('📡 Received realtime rundown update:', payload);
    
    // Ignore updates from the current user to prevent loops
    if (payload.new?.user_id === currentUserId) {
      console.log('🚫 Ignoring update from current user');
      return;
    }

    // Check if this update is newer than our last known update
    const updateTime = new Date(payload.new?.updated_at).getTime();
    if (updateTime <= lastUpdateRef.current) {
      console.log('🚫 Ignoring older update');
      return;
    }

    lastUpdateRef.current = updateTime;

    const updatedRundown = payload.new;
    console.log('🔄 Applying realtime update from another user');

    // Use a slight delay to ensure state updates are batched properly
    setTimeout(() => {
      // Update the rundown data with proper React state updates
      if (updatedRundown.title) {
        console.log('📝 Updating title:', updatedRundown.title);
        setRundownTitle(updatedRundown.title);
      }

      if (updatedRundown.timezone) {
        console.log('🌍 Updating timezone:', updatedRundown.timezone);
        setTimezone(updatedRundown.timezone);
      }

      if (updatedRundown.start_time) {
        console.log('⏰ Updating start time:', updatedRundown.start_time);
        setRundownStartTime(updatedRundown.start_time);
      }

      if (updatedRundown.items && Array.isArray(updatedRundown.items)) {
        console.log('📋 Updating items:', updatedRundown.items.length, 'items');
        // Force a new array reference to trigger re-render
        setItems([...updatedRundown.items]);
      }

      if (updatedRundown.columns && Array.isArray(updatedRundown.columns)) {
        console.log('📊 Updating columns layout');
        handleLoadLayout([...updatedRundown.columns]);
      }

      // Force a re-render by updating the trigger
      setUpdateTrigger(prev => prev + 1);

      console.log('✅ Realtime update applied successfully - UI should refresh');
    }, 10);

  }, [currentUserId, setItems, setRundownTitle, setTimezone, setRundownStartTime, handleLoadLayout]);

  useEffect(() => {
    if (!rundownId || !currentUserId) {
      console.log('⏸️ Not setting up realtime: missing rundownId or userId');
      return;
    }

    console.log('🔗 Setting up realtime sync for rundown:', rundownId);

    // Create a channel for this specific rundown
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
        handleRundownUpdate
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates for rundown:', rundownId);
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Error subscribing to realtime updates');
        }
      });

    channelRef.current = channel;

    return () => {
      console.log('🔌 Cleaning up realtime subscription for rundown:', rundownId);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [rundownId, currentUserId, handleRundownUpdate]);

  // Update last update time when we make changes
  const updateLastUpdateTime = useCallback(() => {
    lastUpdateRef.current = Date.now();
  }, []);

  return {
    updateLastUpdateTime,
    updateTrigger // Expose this so components can use it as a dependency if needed
  };
};
