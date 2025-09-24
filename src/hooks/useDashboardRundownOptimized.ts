import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { SavedRundown } from '@/hooks/useRundownStorage/types';
import { useAuth } from './useAuth';

interface UseDashboardRundownOptimizedProps {
  rundowns: SavedRundown[];
  onRundownUpdate: (updatedRundown: SavedRundown) => void;
  enabled?: boolean;
}

interface PartialRundownUpdate {
  id: string;
  updated_at: string;
  title?: string;
  show_date?: string;
  items?: any[];
  last_updated_by?: string;
}

export const useDashboardRundownOptimized = ({
  rundowns,
  onRundownUpdate,
  enabled = true
}: UseDashboardRundownOptimizedProps) => {
  const { user } = useAuth();
  const subscriptionsRef = useRef<Map<string, any>>(new Map());
  const [connectedCount, setConnectedCount] = useState(0);
  const rundownsRef = useRef(rundowns);

  // Update rundowns ref when rundowns change
  useEffect(() => {
    rundownsRef.current = rundowns;
  }, [rundowns]);

  const handleRundownUpdate = useCallback((payload: { new: PartialRundownUpdate }) => {
    const updatedData = payload.new;
    
    // Find the current rundown to merge with
    const currentRundown = rundownsRef.current.find(r => r.id === updatedData.id);
    if (!currentRundown) {
      return;
    }

    // CRITICAL: Only update if the timestamp actually changed significantly
    const currentTimestamp = new Date(currentRundown.updated_at).getTime();
    const newTimestamp = new Date(updatedData.updated_at).getTime();
    const timeDifference = newTimestamp - currentTimestamp;
    
    // Only update dashboard if timestamp changed by more than 2 seconds (real change)
    if (timeDifference < 2000) {
      return;
    }

    // Create updated rundown by merging relevant fields
    const updatedRundown: SavedRundown = {
      ...currentRundown,
      updated_at: updatedData.updated_at,
      ...(updatedData.title !== undefined && { title: updatedData.title }),
      ...(updatedData.show_date !== undefined && { show_date: updatedData.show_date }),
      ...(updatedData.items !== undefined && { items: updatedData.items }),
      ...(updatedData.last_updated_by !== undefined && { last_updated_by: updatedData.last_updated_by })
    };

    onRundownUpdate(updatedRundown);
  }, [onRundownUpdate]);

  // Set up individual subscriptions for each rundown (more efficient than bulk filter) - with stability checks
  useEffect(() => {
    if (!enabled || !user) {
      // Clean up if disabled
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
      setConnectedCount(0);
      return;
    }

    // Skip if no rundowns yet (still loading)
    if (rundowns.length === 0) {
      return;
    }

    // Only clean up if rundown list actually changed
    const currentRundownIds = new Set(rundowns.map(r => r.id));
    const subscribedRundownIds = new Set(subscriptionsRef.current.keys());
    
    // Check if we need to make changes
    const idsMatch = currentRundownIds.size === subscribedRundownIds.size &&
      [...currentRundownIds].every(id => subscribedRundownIds.has(id));
    
    if (idsMatch) {
      // No changes needed, keep existing subscriptions
      return;
    }

    // Clean up removed rundowns
    subscribedRundownIds.forEach(rundownId => {
      if (!currentRundownIds.has(rundownId)) {
        const channel = subscriptionsRef.current.get(rundownId);
        if (channel) {
          supabase.removeChannel(channel);
          subscriptionsRef.current.delete(rundownId);
          setConnectedCount(prev => Math.max(0, prev - 1));
        }
      }
    });

    // Add subscriptions for new rundowns only
    currentRundownIds.forEach(rundownId => {
      if (!subscribedRundownIds.has(rundownId)) {
        const rundown = rundowns.find(r => r.id === rundownId);
        if (!rundown) return;
        
        const channelName = `dashboard-rundown-${rundown.id}`;
        
        const channel = supabase
          .channel(channelName)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'rundowns',
              filter: `id=eq.${rundown.id}`
            },
            handleRundownUpdate
          )
          .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
              setConnectedCount(prev => prev + 1);
            } else if (status === 'CLOSED') {
              setConnectedCount(prev => Math.max(0, prev - 1));
            }
          });

        subscriptionsRef.current.set(rundown.id, channel);
      }
    });

    return () => {
      subscriptionsRef.current.forEach((channel) => {
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current.clear();
      setConnectedCount(0);
    };
  }, [enabled, user?.id, rundowns.map(r => r.id).join(',')]); // Simplified dependency to prevent churn

  return {
    isConnected: connectedCount > 0,
    connectedCount,
    totalRundowns: rundowns.length
  };
};