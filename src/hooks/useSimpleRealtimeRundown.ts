import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useUniversalTimer } from './useUniversalTimer';
import { updateTimeFromServer } from '@/services/UniversalTimeService';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';

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
  const { setTimeout: setManagedTimeout } = useUniversalTimer('SimpleRealtimeRundown');
  const subscriptionRef = useRef<any>(null);
  const lastProcessedUpdateRef = useRef<string | null>(null);
  const onRundownUpdateRef = useRef(onRundownUpdate);
  const trackOwnUpdateRef = useRef(trackOwnUpdate);
  const subscriptionKeyRef = useRef<string>('');
  const isLeadSubscriptionRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const connectionStableRef = useRef(false);
  const lastErrorLogRef = useRef<number>(0);
  
  // Keep callback refs updated
  onRundownUpdateRef.current = onRundownUpdate;
  trackOwnUpdateRef.current = trackOwnUpdate;

  // Global own update tracking to handle multiple subscriptions
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
      
      // Clean up old tracked updates after 20 seconds (extended window for better save protection)
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

  // Enhanced showcaller-only update detection
  const isShowcallerOnlyUpdate = useCallback((newData: any, oldData?: any) => {
    if (!newData || !oldData) return false;
    
    // Check if ONLY showcaller_state changed (more precise)
    const showcallerChanged = JSON.stringify(newData.showcaller_state) !== JSON.stringify(oldData.showcaller_state);
    
    // Compare all non-showcaller fields
    const nonShowcallerFields = [
      'items', 'title', 'description', 'external_notes', 'columns',
      'archived', 'folder_id', 'created_at', 'start_time', 'timezone'
    ];
    
    let nonShowcallerChanged = false;
    for (const field of nonShowcallerFields) {
      if (JSON.stringify(newData[field]) !== JSON.stringify(oldData[field])) {
        nonShowcallerChanged = true;
        break;
      }
    }
    
    // It's showcaller-only if showcaller changed BUT no other fields changed
    const isShowcallerOnly = showcallerChanged && !nonShowcallerChanged;
    
    if (isShowcallerOnly) {
      console.log('📺 Detected showcaller-only update (no content processing needed)');
    }
    
    return isShowcallerOnly;
  }, []);

  // Conservative structural change detection - only triggers on real structure changes
  const isStructuralChange = useCallback((newData: any, oldData?: any) => {
    if (!newData || !oldData || !newData.items || !oldData.items) return false;
    
    const newItemIds = newData.items.map((item: any) => item.id);
    const oldItemIds = oldData.items.map((item: any) => item.id);
    
    // CONSERVATIVE: Only count length changes as structural
    if (newItemIds.length !== oldItemIds.length) {
      console.log('🏗️ Structural change detected: item count changed', {
        oldCount: oldItemIds.length,
        newCount: newItemIds.length
      });
      return true;
    }
    
    // CONSERVATIVE: Only flag order changes if they're significant (not just content edits)
    const orderChanged = JSON.stringify(newItemIds) !== JSON.stringify(oldItemIds);
    if (orderChanged) {
      // Additional check: ensure this isn't just a content update that looks like reordering
      const hasNewItems = newItemIds.some(id => !oldItemIds.includes(id));
      const hasRemovedItems = oldItemIds.some(id => !newItemIds.includes(id));
      
      if (hasNewItems || hasRemovedItems) {
        console.log('🏗️ Structural change detected: items added/removed with reordering');
        return true;
      }
      
      // Pure reorder - only count if multiple consecutive items changed position
      let positionChanges = 0;
      for (let i = 0; i < newItemIds.length; i++) {
        if (newItemIds[i] !== oldItemIds[i]) {
          positionChanges++;
        }
      }
      
      if (positionChanges > 2) { // More than 2 position changes suggests real reordering
        console.log('🏗️ Structural change detected: significant reordering', { positionChanges });
        return true;
      }
    }
    
    return false; // Not a structural change - just content edits
  }, []);

  // Add typing/unsaved state awareness to prevent overwrites during typing or pending changes
  const isTypingActiveRef = useRef<() => boolean>(() => false);
  const isUnsavedActiveRef = useRef<() => boolean>(() => false);
  
  // Functions to set state checkers from autosave/state hooks
  const setTypingChecker = useCallback((checker: () => boolean) => {
    isTypingActiveRef.current = checker;
  }, []);
  const setUnsavedChecker = useCallback((checker: () => boolean) => {
    isUnsavedActiveRef.current = checker;
  }, []);

  // Simplified update handler with global deduplication and typing awareness
  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    const subscriptionKey = subscriptionKeyRef.current;
    const tracking = activeSubscriptions.get(subscriptionKey);
    
    // Only lead subscription should log and process updates to avoid console spam
    if (!isLeadSubscriptionRef.current) {
      return;
    }

    debugLogger.realtime('Simple realtime update received:', {
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
    
    // Skip if this is exactly the same timestamp we just processed (using normalized form)
    if (normalizedUpdateTimestamp === lastProcessedUpdateRef.current) {
      if (process.env.NODE_ENV === 'development') {
        debugLogger.realtime('Skipping duplicate timestamp:', normalizedUpdateTimestamp);
      }
      return;
    }

    // Enhanced deduplication with stricter matching
    const isOwnUpdate = tracking && tracking.ownUpdates.has(normalizedUpdateTimestamp);
    const isSameUser = payload.new?.last_updated_by === user?.id;
    
    // Additional check: if the last few seconds of updates were from this user, likely our own
    const isRecentOwnUser = payload.new?.last_updated_by === user?.id && 
      Math.abs(new Date(updateTimestamp).getTime() - Date.now()) < 10000; // Within 10 seconds
    
    if (isOwnUpdate || isSameUser || isRecentOwnUser) {
      if (process.env.NODE_ENV === 'development') {
        console.log('🏷️ Own update detected:', { 
          timestamp: normalizedUpdateTimestamp, 
          isStructural: isStructuralChange(payload.new, payload.old),
          matchedTimestamp: isOwnUpdate,
          matchedUserId: isSameUser,
          isRecentOwnUser,
          userId: user?.id,
          lastUpdatedBy: payload.new?.last_updated_by,
          trackedUpdates: Array.from(tracking?.ownUpdates || []).slice(-5) // Only show last 5
        });
      }
      
      debugLogger.realtime('Skipping own update - user/timestamp matched');
      lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
      return;
    }

    // Enhanced filtering with better showcaller separation
    const isContentChange = isContentUpdate(payload.new, payload.old);
    const isShowcallerOnly = isShowcallerOnlyUpdate(payload.new, payload.old);
    const isStructural = isStructuralChange(payload.new, payload.old);
    
    // CRITICAL: Skip showcaller-only updates entirely to prevent feedback loops
    if (isShowcallerOnly) {
      console.log('📺 Skipping showcaller-only update (handled by dedicated showcaller sync)');
      lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
      return;
    }
    
    // CRITICAL: Check if user is actively typing or has unsaved local changes - defer remote updates
    if ((isTypingActiveRef.current && isTypingActiveRef.current()) || (isUnsavedActiveRef.current && isUnsavedActiveRef.current())) {
      console.log('🛡️ Deferring remote update (typing or unsaved local changes present)');
      // Schedule to check again shortly
      setManagedTimeout(() => {
        handleRealtimeUpdate(payload);
      }, 1500);
      return;
    }

    // Only process updates that have actual content changes or are structural
    if (!isContentChange && !isStructural) {
      console.log('⏭️ Skipping meta-only update (no meaningful changes):', {
        changedFields: Object.keys(payload.new || {}).filter(key => 
          JSON.stringify(payload.new[key]) !== JSON.stringify(payload.old?.[key])
        ).slice(0, 3) // Limit to first 3 for conciseness
      });
      lastProcessedUpdateRef.current = normalizedUpdateTimestamp;
      return;
    }
    
    // Set processing indicators based on change type  
    if (isStructural) {
      console.log('🏗️ Processing structural change from teammate (rows added/deleted/moved)');
      setIsProcessingUpdate(true);
    } else if (isContentChange) {
      console.log('✅ Processing content update from teammate');
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
    
    // Clear processing state after short delay using managed timer
    setManagedTimeout(() => {
      setIsProcessingUpdate(false);
    }, 500);
    
  }, [rundownId, isContentUpdate, isShowcallerOnlyUpdate, isStructuralChange]);

  useEffect(() => {
    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }

    const subscriptionKey = `${rundownId}-${user.id}`;
    subscriptionKeyRef.current = subscriptionKey;
    
    // Track this subscription instance
    if (!activeSubscriptions.has(subscriptionKey)) {
      activeSubscriptions.set(subscriptionKey, { count: 0, ownUpdates: new Set() });
    }
    
    const tracking = activeSubscriptions.get(subscriptionKey)!;
    tracking.count++;
    
    // Only the first subscription instance becomes the lead
    const isLead = tracking.count === 1;
    isLeadSubscriptionRef.current = isLead;
    
    if (isLead) {
      console.log('🚀 Setting up lead realtime subscription for rundown:', rundownId);
      
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
            // Throttle error logging to reduce console noise
            const now = Date.now();
            if (now - lastErrorLogRef.current > 3000) {
              console.error('❌ Simple realtime channel error');
              lastErrorLogRef.current = now;
            }
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
    } else {
      // Non-lead subscriptions still get connection status from lead
      setIsConnected(true);
    }

    return () => {
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
      
      connectionStableRef.current = false;
      setIsConnected(false);
      setIsProcessingUpdate(false);
    };
  }, [rundownId, user?.id, enabled, handleRealtimeUpdate]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateLocal,
    setTypingChecker,
    setUnsavedChecker
  };
};
