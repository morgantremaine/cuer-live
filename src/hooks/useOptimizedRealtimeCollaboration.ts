import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

interface UseOptimizedRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: () => void;
  onReloadCurrentRundown?: () => void;
  enabled?: boolean;
}

export const useOptimizedRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  onReloadCurrentRundown,
  enabled = true
}: UseOptimizedRealtimeCollaborationProps) => {
  const { user } = useAuth();
  
  // Optimized refs to prevent re-renders
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
  const processingTimeoutRef = useRef<NodeJS.Timeout>();
  
  // Keep refs updated without triggering effects
  currentRundownIdRef.current = rundownId;
  userIdRef.current = user?.id || null;
  onRemoteUpdateRef.current = onRemoteUpdate;
  onReloadCurrentRundownRef.current = onReloadCurrentRundown;
  enabledRef.current = enabled;

  // Optimized own update tracking
  const trackOwnUpdate = useCallback((timestamp: string) => {
    ownUpdateTrackingRef.current.add(timestamp);
    lastSaveTimestamp.current = timestamp;
    
    // Clean up old tracked updates after shorter time
    setTimeout(() => {
      ownUpdateTrackingRef.current.delete(timestamp);
    }, 8000); // Reduced from 10000ms
  }, []);

  // Optimized showcaller detection with better performance
  const isShowcallerOnlyUpdate = useCallback((oldData: any, newData: any): boolean => {
    if (!oldData || !newData) return false;

    // Quick field comparison without deep JSON operations
    const contentFields = ['title', 'items', 'start_time', 'timezone'];
    
    for (const field of contentFields) {
      if (field === 'items') {
        // Lightweight items comparison
        const oldItems = oldData.items || [];
        const newItems = newData.items || [];
        if (oldItems.length !== newItems.length) return false;
        
        // Quick check on first few items instead of full comparison
        const checkCount = Math.min(3, oldItems.length);
        for (let i = 0; i < checkCount; i++) {
          if (oldItems[i]?.id !== newItems[i]?.id || 
              oldItems[i]?.name !== newItems[i]?.name) {
            return false;
          }
        }
      } else {
        if (oldData[field] !== newData[field]) {
          return false;
        }
      }
    }
    
    // If no content changed, check if showcaller_state changed
    return JSON.stringify(oldData.showcaller_state || {}) !== JSON.stringify(newData.showcaller_state || {});
  }, []);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
      isConnectedRef.current = false;
      lastSetupRundownId.current = null;
      lastSetupUserId.current = null;
    }
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
  }, []);

  // Optimized realtime update handler
  const handleRealtimeUpdate = useCallback((payload: any) => {
    const currentUserId = userIdRef.current;
    const currentRundownId = currentRundownIdRef.current;
    const updateTimestamp = payload.new?.updated_at;
    
    // Quick validation checks
    if (!currentRundownId || payload.new?.id !== currentRundownId) {
      return;
    }

    // Skip duplicate timestamps
    if (updateTimestamp && updateTimestamp === lastProcessedTimestamp.current) {
      return;
    }

    // Skip our own updates
    if (updateTimestamp && ownUpdateTrackingRef.current.has(updateTimestamp)) {
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Skip if matches last save timestamp
    if (updateTimestamp && updateTimestamp === lastSaveTimestamp.current) {
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Optimized showcaller-only detection
    const isShowcallerOnly = isShowcallerOnlyUpdate(payload.old, payload.new);
    if (isShowcallerOnly) {
      lastProcessedTimestamp.current = updateTimestamp;
      return;
    }

    // Additional check for very recent updates to prevent conflicts
    if (updateTimestamp) {
      const updateTime = new Date(updateTimestamp).getTime();
      const now = Date.now();
      const isVeryRecent = (now - updateTime) < 6000; // Reduced from 8000ms
      
      if (isVeryRecent) {
        const hasRecentOwnUpdates = Array.from(ownUpdateTrackingRef.current).some(trackedTimestamp => {
          const trackedTime = new Date(trackedTimestamp).getTime();
          return Math.abs(updateTime - trackedTime) < 12000; // Reduced from 15000ms
        });
        
        if (hasRecentOwnUpdates) {
          lastProcessedTimestamp.current = updateTimestamp;
          return;
        }

        if (lastSaveTimestamp.current) {
          const lastSaveTime = new Date(lastSaveTimestamp.current).getTime();
          if (Math.abs(updateTime - lastSaveTime) < 6000) { // Reduced from 8000ms
            lastProcessedTimestamp.current = updateTimestamp;
            return;
          }
        }
      }
    }

    lastProcessedTimestamp.current = updateTimestamp;
    
    // Optimized debounced update processing
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }
    
    processingTimeoutRef.current = setTimeout(() => {
      try {
        onRemoteUpdateRef.current();
        
        // Reload after shorter delay
        if (onReloadCurrentRundownRef.current) {
          setTimeout(() => {
            try {
              onReloadCurrentRundownRef.current?.();
            } catch (error) {
              console.error('Error in onReloadCurrentRundown callback:', error);
            }
          }, 50); // Reduced from 100ms
        }
      } catch (error) {
        console.error('Error in onRemoteUpdate callback:', error);
      }
    }, 100); // Reduced from 150ms
    
  }, [isShowcallerOnlyUpdate]);

  // Setup subscription with optimized logic
  useEffect(() => {
    const currentUserId = user?.id;
    const currentRundownId = rundownId;
    const currentEnabled = enabled;

    // Only setup if needed and different from current
    if (currentEnabled && currentUserId && currentRundownId && 
        (lastSetupRundownId.current !== currentRundownId || lastSetupUserId.current !== currentUserId)) {
      
      cleanup();
      
      // Unique channel per user-rundown combination
      const channelId = `optimized-collaboration-${currentRundownId}-${currentUserId}`;
      
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
