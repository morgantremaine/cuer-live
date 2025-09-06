import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { useAuth } from './useAuth';

interface UseDashboardRundownRealtimeProps {
  rundowns: SavedRundown[];
  onRundownUpdate: (updatedRundown: SavedRundown) => void;
  enabled?: boolean;
}

interface RealtimeRundownUpdate {
  id: string;
  updated_at: string;
  last_updated_by?: string;
  items?: any[];
  title?: string;
  show_date?: string;
}

export const useDashboardRundownRealtime = ({
  rundowns,
  onRundownUpdate,
  enabled = true
}: UseDashboardRundownRealtimeProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const rundownsRef = useRef(rundowns);
  const onRundownUpdateRef = useRef(onRundownUpdate);

  // Keep refs updated
  rundownsRef.current = rundowns;
  onRundownUpdateRef.current = onRundownUpdate;

  // Get rundown IDs we should subscribe to
  const rundownIds = rundowns.map(r => r.id);

  const handleRundownUpdate = useCallback((payload: any) => {
    console.log('🎯 Dashboard: Received rundown realtime update:', payload);
    
    const updatedData = payload.new as RealtimeRundownUpdate;
    const rundownId = updatedData.id;
    
    // Find the rundown in our current list
    const existingRundown = rundownsRef.current.find(r => r.id === rundownId);
    if (!existingRundown) {
      console.log('🎯 Dashboard: Rundown not in current view, ignoring update');
      return;
    }

    // Create updated rundown object with new data
    const updatedRundown: SavedRundown = {
      ...existingRundown,
      updated_at: updatedData.updated_at,
      last_updated_by: updatedData.last_updated_by || existingRundown.last_updated_by,
      title: updatedData.title || existingRundown.title,
      show_date: updatedData.show_date !== undefined ? updatedData.show_date : existingRundown.show_date,
      items: updatedData.items || existingRundown.items
    };

    console.log('🎯 Dashboard: Updating rundown card:', {
      id: rundownId,
      title: updatedRundown.title,
      lastUpdated: updatedRundown.updated_at,
      lastUpdatedBy: updatedRundown.last_updated_by,
      itemCount: updatedRundown.items?.length
    });

    // Notify parent component of the update
    onRundownUpdateRef.current(updatedRundown);
  }, []);

  useEffect(() => {
    // Clear existing subscription
    if (subscriptionRef.current) {
      console.log('🎯 Dashboard: Cleaning up existing realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }

    // Don't subscribe if disabled, no user, or no rundowns
    if (!enabled || !user || rundownIds.length === 0) {
      console.log('🎯 Dashboard: Realtime subscription not ready:', { 
        enabled, 
        user: !!user, 
        rundownCount: rundownIds.length 
      });
      return;
    }

    console.log('🎯 Dashboard: Setting up realtime subscription for rundowns:', rundownIds);

    // Subscribe to updates for all dashboard rundowns
    const channel = supabase
      .channel('dashboard-rundowns')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=in.(${rundownIds.join(',')})`
        },
        handleRundownUpdate
      )
      .subscribe((status) => {
        console.log('🎯 Dashboard: Realtime subscription status:', status);
        setIsConnected(status === 'SUBSCRIBED');
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🎯 Dashboard: Cleaning up realtime subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        setIsConnected(false);
      }
    };
  }, [enabled, user, rundownIds.join(','), handleRundownUpdate]);

  return {
    isConnected
  };
};
