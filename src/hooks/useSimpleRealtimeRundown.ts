import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUniversalTimer } from './useUniversalTimer';
import { updateTimeFromServer } from '@/services/UniversalTimeService';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

interface UseSimpleRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate: (data: any) => void;
  enabled?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
}

// Global subscription tracking to prevent duplicates
const activeSubscriptions = new Map<string, { count: number; ownUpdates: Set<string> }>();

export const useSimpleRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  enabled = true,
  trackOwnUpdate
}: UseSimpleRealtimeRundownProps) => {
  const { user } = useAuth();
  const { setTimeout: setManagedTimeout, clearTimer } = useUniversalTimer('SimpleRealtimeRundown');
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const subscriptionKeyRef = useRef<string>('');
  const isLeadSubscriptionRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const connectionStableRef = useRef(false);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<string | null>(null);
  const heartbeatTimerRef = useRef<string | null>(null);
  const lastHeartbeatRef = useRef<number>(Date.now());
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Optimized own update tracking with duplicate prevention
  const trackOwnUpdateLocal = useCallback((timestamp: string) => {
    const subscriptionKey = subscriptionKeyRef.current;
    if (!subscriptionKey) return;
    
    // Normalize timestamp to ensure consistent format matching
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    
    // Always track own updates for deduplication
    const tracking = activeSubscriptions.get(subscriptionKey);
    if (tracking) {
      tracking.ownUpdates.add(normalizedTimestamp);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('🏷️ Tracking own update:', { original: timestamp, normalized: normalizedTimestamp });
      }
      
      // Clean up old tracked updates after 20 seconds (extended for safety)
      setManagedTimeout(() => {
        tracking.ownUpdates.delete(normalizedTimestamp);
      }, 20000);
    }
    
    // Also track via parent if available
    if (trackOwnUpdateRef.current) {
      trackOwnUpdateRef.current(timestamp);
    }
  }, [setManagedTimeout]);

  // Helper function to detect if an update has actual content changes
  const isContentUpdate = useCallback((newData: any, oldData?: any) => {
    if (!newData || !oldData) return true; // Assume content change if we can't compare
    
    // Only these fields count as "content" - changes to other fields are meta-only
    const contentFields = [
      'items', 'title', 'start_time', 'timezone', 'description', 'external_notes'
    ];
    
    for (const field of contentFields) {
      if (JSON.stringify(newData[field]) !== JSON.stringify(oldData[field])) {
        console.log(`📝 Content change detected in field: ${field}`);
        return true; // Actual content changed
      }
    }
    
    return false; // Only meta fields changed (folder_id, showcaller_state, etc.)
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

  // Helper function to detect structural changes (add/delete/move rows)
  const isStructuralChange = useCallback((newData: any, oldData?: any) => {
    if (!newData || !oldData || !newData.items || !oldData.items) return false;
    
    // Compare item IDs and order - if different, it's structural
    const newItemIds = newData.items.map((item: any) => item.id);
    const oldItemIds = oldData.items.map((item: any) => item.id);
    
    // Different number of items = structural change
    if (newItemIds.length !== oldItemIds.length) {
      return true;
    }
    
    // Different order of items = structural change (row move)
    return JSON.stringify(newItemIds) !== JSON.stringify(oldItemIds);
  }, []);

  // Simplified update handler with global deduplication
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    // Record heartbeat on any incoming message
    lastHeartbeatRef.current = Date.now();

    const subscriptionKey = subscriptionKeyRef.current;
    const tracking = activeSubscriptions.get(subscriptionKey);
    
    // Only lead subscription should log and process updates to avoid console spam
    if (!isLeadSubscriptionRef.current) {
      return;
    }

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
    const normalizedUpdateTimestamp = normalizeTimestamp(updateTimestamp);
    
    // Check if this is a structural change (add/delete/move rows)
    const isStructural = isStructuralChange(payload.new, payload.old);
    
    // Skip if this is exactly the same timestamp we just processed (using normalized form)
    if (normalizedUpdateTimestamp === lastProcessedUpdateRef.current) {
      if (process.env.NODE_ENV === 'development') {
        console.log('⏭️ Skipping duplicate timestamp:', normalizedUpdateTimestamp);
      }
      return;
    }

    // Enhanced deduplication with safer matching
    const isOwnUpdate = tracking && tracking.ownUpdates.has(normalizedUpdateTimestamp);
    const isSameUser = payload.new?.last_updated_by === user?.id;
    
    // Additional check: if update is very recent from this user, likely our own
    const updateTime = new Date(updateTimestamp).getTime();
    const timeDiff = Math.abs(updateTime - Date.now());
    const isRecentOwnUser = isSameUser && timeDiff < 8000; // Within 8 seconds instead of 10
    
    // Only skip if we have strong evidence it's our own update
    if (isOwnUpdate || (isSameUser && isRecentOwnUser)) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🏷️ Own update detected:', { 
          timestamp: normalizedUpdateTimestamp, 
          isStructural,
          matchedTimestamp: isOwnUpdate,
          matchedUserId: isSameUser,
          isRecentOwnUser,
          userId: user?.id,
          lastUpdatedBy: payload.new?.last_updated_by,
          trackedUpdates: Array.from(tracking?.ownUpdates || []).slice(-5) // Only show last 5
        });
      }
      
      console.log('⏭️ Skipping own update - user/timestamp matched');
      lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
      return;
    }

  // Enhanced content filtering to prevent meta-only updates from merging
  const isContentChange = isContentUpdate(payload.new, payload.old);
  const isShowcallerOnly = isShowcallerOnlyUpdate(payload.new, payload.old);
  
    // Only process updates that have actual content changes
    if (!isContentChange && !isStructural) {
      console.log('⏭️ Skipping meta-only update (no content changes)', {
        changedFields: Object.keys(payload.new || {}).filter(key => 
          JSON.stringify(payload.new[key]) !== JSON.stringify(payload.old?.[key])
        )
      });
      lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
      return;
    }
  
  if (isShowcallerOnly) {
    console.log('📺 Processing showcaller-only update (no loading indicator)');
  } else if (isStructural) {
    console.log('🏗️ Processing structural change from teammate (rows added/deleted/moved)');
    // Show processing state briefly for structural changes
    setIsProcessingUpdate(true);
  } else if (isContentChange) {
    console.log('✅ Processing realtime content update from teammate');
    // Show processing state briefly for all content updates from teammates
    setIsProcessingUpdate(true);
  }
    
    lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
    
    try {
      // Sync time from server timestamp
      if (payload.new?.updated_at) {
        updateTimeFromServer(payload.new.updated_at);
      }
      
      // Apply the update directly
      onRundownUpdateRef.current(payload.new);
    } catch (error) {
      console.error('Error processing realtime update:', error);
    }
    
    // Clear processing state after short delay using managed timer (only if we set it)
    if (!isShowcallerOnly) {
      setManagedTimeout(() => {
        setIsProcessingUpdate(false);
      }, 500);
    }
    
  }, [rundownId, isContentUpdate, isShowcallerOnlyUpdate, isStructuralChange]);

  // Auto-reconnect logic with exponential backoff
  const attemptReconnect = useCallback(() => {
    if (!rundownId || !user || !enabled) return;
    
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000); // Cap at 30s
    console.log(`🔄 Attempting reconnect in ${delay}ms (attempt ${reconnectAttemptRef.current + 1})`);
    
    if (reconnectTimerRef.current) {
      clearTimer(reconnectTimerRef.current);
    }
    
    reconnectTimerRef.current = setManagedTimeout(() => {
      reconnectAttemptRef.current++;
      console.log(`🔄 Reconnecting realtime subscription (attempt ${reconnectAttemptRef.current})`);
      
      // Clean up old subscription
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
      
      // Create new subscription with same logic as initial setup
      setupSubscription('reconnect');
    }, delay);
  }, [rundownId, user, enabled, setManagedTimeout, clearTimer]);
  
  // Setup subscription logic extracted for reuse
  const setupSubscription = useCallback((mode: 'initial' | 'reconnect' = 'initial') => {
    if (!rundownId || !user || !enabled) {
      return;
    }

    const subscriptionKey = `${rundownId}-${user.id}`;
    subscriptionKeyRef.current = subscriptionKey;
    
    // Ensure tracking exists
    if (!activeSubscriptions.has(subscriptionKey)) {
      activeSubscriptions.set(subscriptionKey, { count: 0, ownUpdates: new Set() });
    }
    
    const tracking = activeSubscriptions.get(subscriptionKey)!;

    // Determine lead status
    let isLead = false;
    if (mode === 'initial') {
      tracking.count++;
      isLead = tracking.count === 1;
    } else {
      // During reconnect, preserve previous lead status (or become lead if no active channel)
      isLead = isLeadSubscriptionRef.current || !subscriptionRef.current;
    }
    isLeadSubscriptionRef.current = isLead;

    if (isLead) {
      console.log(`🚀 Setting up ${mode} lead realtime subscription for rundown:`, rundownId);
      
      const channel = supabase
        .channel(`simple-realtime-${subscriptionKey}`)
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
          lastHeartbeatRef.current = Date.now();
          
          if (status === 'SUBSCRIBED') {
            setIsConnected(true);
            connectionStableRef.current = true;
            reconnectAttemptRef.current = 0; // Reset reconnect attempts on success
            console.log('✅ Simple realtime connected successfully');
            
            // Start/refresh heartbeat monitoring
            if (heartbeatTimerRef.current) {
              clearTimer(heartbeatTimerRef.current);
            }
            heartbeatTimerRef.current = setManagedTimeout(() => {
              checkConnectionHealth();
            }, 30000); // Check every 30 seconds
            
          } else if (status === 'CHANNEL_ERROR') {
            connectionStableRef.current = false;
            setIsConnected(false);
            console.error('❌ Simple realtime channel error - attempting reconnect');
            attemptReconnect();
            
          } else if (status === 'TIMED_OUT') {
            connectionStableRef.current = false;
            setIsConnected(false);
            console.error('⏰ Simple realtime connection timed out - attempting reconnect');
            attemptReconnect();
            
          } else if (status === 'CLOSED') {
            connectionStableRef.current = false;
            setIsConnected(false);
            console.warn('🔌 Simple realtime connection closed - attempting reconnect');
            attemptReconnect();
          }
        });

      subscriptionRef.current = channel;
    } else {
      // Non-lead subscriptions still get connection status from lead
      setIsConnected(true);
    }
  }, [rundownId, user, enabled, handleRealtimeUpdate, attemptReconnect, setManagedTimeout, clearTimer]);
  
  // Connection health monitoring
  const checkConnectionHealth = useCallback(() => {
    const now = Date.now();
    const timeSinceLastHeartbeat = now - lastHeartbeatRef.current;
    
    if (timeSinceLastHeartbeat > 60000) { // No activity for 1 minute
      console.warn('💔 Connection health check failed - attempting reconnect');
      setIsConnected(false);
      attemptReconnect();
    } else {
      // Schedule next health check
      if (heartbeatTimerRef.current) {
        clearTimer(heartbeatTimerRef.current);
      }
      heartbeatTimerRef.current = setManagedTimeout(() => {
        checkConnectionHealth();
      }, 30000);
    }
  }, [attemptReconnect, setManagedTimeout, clearTimer]);

  useEffect(() => {
    setupSubscription();

    return () => {
      const subscriptionKey = subscriptionKeyRef.current;
      const tracking = activeSubscriptions.get(subscriptionKey);
      if (tracking) {
        tracking.count--;
        
        // Clean up if this was the last subscription
        if (tracking.count <= 0) {
          activeSubscriptions.delete(subscriptionKey);
          
          if (subscriptionRef.current) {
            console.log('🧹 Cleaning up lead realtime subscription');
            supabase.removeChannel(subscriptionRef.current);
            subscriptionRef.current = null;
          }
        }
      }
      
      // Clean up timers
      if (reconnectTimerRef.current) {
        clearTimer(reconnectTimerRef.current);
      }
      if (heartbeatTimerRef.current) {
        clearTimer(heartbeatTimerRef.current);
      }
      
      connectionStableRef.current = false;
      setIsConnected(false);
      setIsProcessingUpdate(false);
    };
  }, [setupSubscription, clearTimer]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateLocal
  };
};
