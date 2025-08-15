import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUniversalTimer } from './useUniversalTimer';

interface UseSimpleRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate: (data: any) => void;
  enabled?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
}

export const useSimpleRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  enabled = true,
  trackOwnUpdate
}: UseSimpleRealtimeRundownProps) => {
  const { user } = useAuth();
  const { setTimeout: setManagedTimeout } = useUniversalTimer('SimpleRealtimeRundown');
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const connectionStableRef = useRef(false);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Simple own update tracking
  const trackOwnUpdateLocal = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    
    // Clean up old tracked updates after 5 seconds
    setManagedTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 5000);
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, []);

  // Helper function to detect if an update is showcaller-only
  const isShowcallerOnlyUpdate = useCallback((newData: any, oldData?: any) => {
    if (!newData || !oldData) return false;
    
    // Compare all fields except showcaller_visual_state
    const fieldsToCheck = [
      'items', 'title', 'description', 'external_notes', 'columns',
      'archived', 'folder_id', 'created_at'
    ];
    
    for (const field of fieldsToCheck) {
      if (JSON.stringify(newData[field]) !== JSON.stringify(oldData[field])) {
        return false; // Non-showcaller field changed
      }
    }
    
    // Only showcaller_visual_state changed (or no meaningful changes)
    return true;
  }, []);

  // Simplified update handler
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📡 Simple realtime update received:', {
      id: payload.new?.id,
      timestamp: payload.new?.updated_at,
      itemCount: payload.new?.items?.length
    });

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    const updateTimestamp = payload.new?.updated_at;
    
    // Skip if this is exactly the same timestamp we just processed
    if (updateTimestamp === lastProcessedUpdateRef.current) {
      return;
    }

    // Skip if this is our own update
    console.log('🔍 Checking own update tracking:', {
      updateTimestamp,
      trackedUpdates: Array.from(ownUpdateTrackingRef.current),
      hasTimestamp: ownUpdateTrackingRef.current.has(updateTimestamp)
    });
    
    if (ownUpdateTrackingRef.current.has(updateTimestamp)) {
      console.log('⏭️ Skipping - our own update');
      lastProcessedUpdateRef.current = updateTimestamp;
      return;
    }

    // Check if this is a showcaller-only update and skip processing indicator
    const isShowcallerOnly = isShowcallerOnlyUpdate(payload.new, payload.old);
    
    if (isShowcallerOnly) {
      console.log('📺 Processing showcaller-only update (no loading indicator)');
    } else {
      console.log('✅ Processing realtime update from teammate');
      console.log('🔵 Setting isProcessingUpdate to TRUE');
      // Show processing state briefly only for non-showcaller updates
      setIsProcessingUpdate(true);
      console.log('🔵 isProcessingUpdate state should now be TRUE');
    }
    
    lastProcessedUpdateRef.current = updateTimestamp;
    
    try {
      console.log('🔄 Calling onRundownUpdate with data:', {
        itemCount: payload.new?.items?.length,
        title: payload.new?.title,
        hasItems: !!payload.new?.items
      });
      // Apply the update directly
      onRundownUpdateRef.current(payload.new);
      console.log('✅ onRundownUpdate completed successfully');
    } catch (error) {
      console.error('❌ Error in onRundownUpdate callback:', error);
    }
    
    // Clear processing state after short delay using managed timer (only if we set it)
    if (!isShowcallerOnly) {
      console.log('🔵 Setting timeout to clear isProcessingUpdate in 500ms');
      setManagedTimeout(() => {
        console.log('🔵 Clearing isProcessingUpdate - setting to FALSE');
        setIsProcessingUpdate(false);
      }, 500);
    }
    
  }, [rundownId, isShowcallerOnlyUpdate]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up existing simple realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      setIsConnected(false);
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }
    
    console.log('🚀 Setting up simple realtime subscription for rundown:', rundownId);
    
    const channel = supabase
      .channel(`simple-realtime-${rundownId}-${user.id}`)
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
        console.log('🔗 Simple realtime subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setIsConnected(true);
          connectionStableRef.current = true;
          console.log('✅ Simple realtime connected successfully');
        } else if (status === 'CHANNEL_ERROR') {
          connectionStableRef.current = false;
          setManagedTimeout(() => {
            if (!connectionStableRef.current) {
              setIsConnected(false);
            }
          }, 1000);
          console.error('❌ Simple realtime channel error');
        } else if (status === 'TIMED_OUT') {
          connectionStableRef.current = false;
          setManagedTimeout(() => {
            if (!connectionStableRef.current) {
              setIsConnected(false);
            }
          }, 1000);
          console.error('⏰ Simple realtime connection timed out');
        } else if (status === 'CLOSED') {
          connectionStableRef.current = false;
          if (subscriptionRef.current) {
            setManagedTimeout(() => {
              if (!connectionStableRef.current) {
                setIsConnected(false);
              }
            }, 500);
          }
        }
      });

    subscriptionRef.current = channel;

    return () => {
      console.log('🧹 Cleaning up simple realtime subscription');
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      connectionStableRef.current = false;
      setIsConnected(false);
      setIsProcessingUpdate(false);
    };
  }, [rundownId, user?.id, enabled, handleRealtimeUpdate]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
