import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UseStableRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  onReloadCurrentRundown?: () => void;
  enabled?: boolean;
}

export const useStableRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  onReloadCurrentRundown,
  enabled = true
}: UseStableRealtimeCollaborationProps) => {
  const { user } = useAuth();
  
  // Use refs to store ALL values and prevent ANY re-renders
  const subscriptionRef = useRef<any>(null);
  const isConnectedRef = useRef(false);
  const currentRundownIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  const onReloadCurrentRundownRef = useRef(onReloadCurrentRundown);
  const enabledRef = useRef(enabled);
  const lastSetupRundownId = useRef<string | null>(null);
  const lastSetupUserId = useRef<string | null>(null);
  const ownUpdateTrackingRef = useRef<Set<string>>(new Set());
  const lastProcessedTimestamp = useRef<string | null>(null);
  const lastSaveTimestamp = useRef<string | null>(null);
  
  // Keep refs updated but NEVER trigger effects
  currentRundownIdRef.current = rundownId;
  userIdRef.current = user?.id || null;
  onRemoteUpdateRef.current = onRemoteUpdate;
  onReloadCurrentRundownRef.current = onReloadCurrentRundown;
  enabledRef.current = enabled;

  // Track our own updates to avoid processing them
  const trackOwnUpdate = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    lastSaveTimestamp.current = timestamp;
    
    // Clean up old tracked updates after 10 seconds
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 10000);
  }, []);

  // Enhanced showcaller detection
  const isShowcallerOnlyUpdate = useCallback((oldData: any, newData: any): boolean => {
    if (!oldData || !newData) return false;

    // Check if only showcaller_state changed
    const fieldsToCheck = ['title', 'items', 'start_time', 'timezone'];
    
    for (const field of fieldsToCheck) {
      if (field === 'items') {
        const oldItemsStr = JSON.stringify(oldData.items || []);
        const newItemsStr = JSON.stringify(newData.items || []);
        if (oldItemsStr !== newItemsStr) {
          return false; // Content changed
        }
      } else {
        if (oldData[field] !== newData[field]) {
          return false; // Content changed
        }
      }
    }
    
    // If we get here, no content changed - check if showcaller_state changed
    const showcallerStateChanged = JSON.stringify(oldData.showcaller_state || {}) !== JSON.stringify(newData.showcaller_state || {});
    return showcallerStateChanged;
  }, []);

  // Create stable cleanup function that never changes
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      lastSetupRundownId.current = null;
      lastSetupUserId.current = null;
    }
  }, []);

  // Create stable handler that never changes
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const currentUserId = userIdRef.current;
    const currentRundownId = currentRundownIdRef.current;
    const updateTimestamp = payload.new?.updated_at;
    
    // Only process updates for the current rundown
    if (!currentRundownId || payload.new?.id !== currentRundownId) {
      return;
    }

    // Skip if this is exactly the same timestamp we just processed
    if (updateTimestamp && updateTimestamp === lastProcessedTimestamp.current) {
      return;
    }

    // Skip if this update timestamp is in our tracked updates (our own updates)
    if (updateTimestamp && ownUpdateTrackingRef.current.has(updateTimestamp)) {
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Skip if this matches our last save timestamp
    if (updateTimestamp && updateTimestamp === lastSaveTimestamp.current) {
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Enhanced showcaller-only detection
    const isShowcallerOnly = isShowcallerOnlyUpdate(payload.old, payload.new);
    if (isShowcallerOnly) {
      // For showcaller-only updates, don't trigger content reload
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Additional check for very recent updates from same user
    if (updateTimestamp) {
      const updateTime = new Date(updateTimestamp).getTime();
      const now = Date.now();
      const isVeryRecent = (now - updateTime) < 8000;
      
      if (isVeryRecent) {
        // Check if we have any tracked updates within the last 15 seconds
        const hasRecentOwnUpdates = Array.from(ownUpdateTrackingRef.current).some(trackedTimestamp => {
          const trackedTime = new Date(trackedTimestamp).getTime();
          return Math.abs(updateTime - trackedTime) < 15000;
        });
        
        if (hasRecentOwnUpdates) {
          lastProcessedTimestamp.current = updateTimestamp;
          return;
        }

        // Additional check: if we just saved within the last 8 seconds, it's probably our update
        if (lastSaveTimestamp.current) {
          const lastSaveTime = new Date(lastSaveTimestamp.current).getTime();
          if (Math.abs(updateTime - lastSaveTime) < 8000) {
            lastProcessedTimestamp.current = updateTimestamp;
            return;
          }
        }
      }
    }

    lastProcessedTimestamp.current = updateTimestamp;
    
    // Trigger remote update callback immediately
    try {
      onRemoteUpdateRef.current();
    } catch (error) {
      console.error('Error in onRemoteUpdate callback:', error);
    }
    
    // Reload current rundown data after a short delay to show changes
    if (onReloadCurrentRundownRef.current) {
      setTimeout(() => {
        try {
          onReloadCurrentRundownRef.current?.();
        } catch (error) {
          console.error('Error in onReloadCurrentRundown callback:', error);
        }
      }, 100);
    }
  }, [isShowcallerOnlyUpdate]);

  // Separate effect to handle rundown changes - prevent unnecessary re-subscriptions
  useEffect(() => {
    const currentUserId = user?.id;
    const currentRundownId = rundownId;
    const currentEnabled = enabled;

    // Only setup if we have all required data and it's different from what we have
    if (currentEnabled && currentUserId && currentRundownId && 
        (lastSetupRundownId.current !== currentRundownId || lastSetupUserId.current !== currentUserId)) {
      
      // Cleanup existing
      cleanup();
      
      // Setup new subscription with unique channel per user
      const channelId = `stable-collaboration-${currentRundownId}-${currentUserId}`;
      
      const channel = supabase
        .channel(channelId)
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
          if (status === 'SUBSCRIBED') {
            isConnectedRef.current = true;
          } else if (status === 'CHANNEL_ERROR') {
            cleanup();
          }
        });

      subscriptionRef.current = channel;
      lastSetupRundownId.current = currentRundownId;
      lastSetupUserId.current = currentUserId;
    } else if (!currentEnabled || !currentUserId || !currentRundownId) {
      cleanup();
    }

    return cleanup;
  }, [user?.id, rundownId, enabled, handleRealtimeUpdate, cleanup]);

  return {
    isConnected: isConnectedRef.current,
    trackOwnUpdate
  };
};
