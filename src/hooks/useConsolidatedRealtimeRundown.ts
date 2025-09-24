import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';

interface UseConsolidatedRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
  lastSeenDocVersion?: number;
  isSharedView?: boolean;
  blockUntilLocalEditRef?: React.MutableRefObject<boolean>;
}

// Enhanced global subscription state with better conflict prevention
const globalSubscriptions = new Map<string, {
  subscription: any;
  callbacks: {
    onRundownUpdate: Set<(data: any) => void>;
    onShowcallerUpdate: Set<(data: any) => void>;
    onBlueprintUpdate: Set<(data: any) => void>;
  };
  trackOwnUpdate: Set<(timestamp: string) => void>;
  ownUpdates: Set<string>;
  lastProcessedTimestamp: string | null;
  lastProcessedDocVersion: number;
  isConnected: boolean;
  refCount: number;
  gapDetectionInProgress: boolean; // New: prevent concurrent gap detection
  itemDirtyQueue?: Array<{
    payload: any;
    timestamp: string;
    docVersion: number;
    queuedAt: number;
  }>;
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  trackOwnUpdate,
  lastSeenDocVersion = 0,
  isSharedView = false,
  blockUntilLocalEditRef
}: UseConsolidatedRealtimeRundownProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);

  // Set connected immediately when rundown is enabled (ready for editing)
  useEffect(() => {
    if (enabled && rundownId) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [enabled, rundownId]);
  
  // Simplified callback refs (no tab coordination needed)
  const callbackRefs = useRef({
    onRundownUpdate,
    onShowcallerUpdate,
    onBlueprintUpdate,
    trackOwnUpdate
  });

  // Keep refs updated
  callbackRefs.current = {
    onRundownUpdate,
    onShowcallerUpdate,
    onBlueprintUpdate,
    trackOwnUpdate
  };

  // Performance-optimized realtime update processing with early size checks
  const processRealtimeUpdate = useCallback(async (payload: any, globalState: any) => {
    const updateTimestamp = payload.new?.updated_at;
    const normalizedTimestamp = normalizeTimestamp(updateTimestamp);
    const incomingDocVersion = payload.new?.doc_version || 0;

    // Skip if not for current rundown 
    if (payload.new?.id !== rundownId && payload.new?.rundown_id !== rundownId) {
      return;
    }

    // Performance optimization: Early size check for very large updates
    const itemCount = payload.new?.items?.length || 0;
    if (itemCount > 300) {
      console.log('🐌 Large update detected, using performance mode:', itemCount, 'items');
      // Add small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Enhanced doc version checking - prevent race conditions
    const currentDocVersion = globalState.lastProcessedDocVersion;
    
    // Skip stale updates more aggressively 
    if (incomingDocVersion && incomingDocVersion <= currentDocVersion) {
      debugLogger.realtime('Skipping stale doc version:', {
        incoming: incomingDocVersion,
        lastProcessed: currentDocVersion,
        timestamp: normalizedTimestamp
      });
      return;
    }

    // Enhanced timestamp deduplication
    if (normalizedTimestamp && normalizedTimestamp === globalState.lastProcessedTimestamp) {
      debugLogger.realtime('Skipping duplicate timestamp:', normalizedTimestamp);
      return;
    }

    // FIXED: Skip updates from same tab (not same user)
    if (payload.new?.tab_id === getTabId()) {
      console.log('⏭️ Skipping realtime update - own update (same tab)');
      return;
    }

    // BULLETPROOF: Import LocalShadow for advanced field protection
    const { localShadowStore } = await import('@/state/localShadows');
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Check if this update affects any actively edited items (item-level dirty protection)
    const hasActivelyEditedItems = payload.new?.items && Array.isArray(payload.new.items) && 
      payload.new.items.some((item: any) => activeShadows.items.has(item.id));
    
    if (hasActivelyEditedItems) {
      console.log('🛡️ Realtime: Queueing update - actively editing items', {
        activeItems: Array.from(activeShadows.items.keys()),
        docVersion: incomingDocVersion
      });
      
      // Queue the update to be processed after active editing stops
      if (!globalState.itemDirtyQueue) {
        globalState.itemDirtyQueue = [];
      }
      
      globalState.itemDirtyQueue.push({
        payload,
        timestamp: normalizedTimestamp,
        docVersion: incomingDocVersion,
        queuedAt: Date.now()
      });
      
      // Process queued updates after a brief delay (when typing stops)
      setTimeout(() => {
        processQueuedUpdates(globalState);
      }, 2000);
      
      return; // Don't process immediately
    }

    // Enhanced gap detection with improved handling
    const expectedVersion = currentDocVersion + 1;
    const hasSignificantGap = incomingDocVersion && incomingDocVersion > (expectedVersion + 1); // Allow 1 version tolerance
    
    if (hasSignificantGap && !globalState.gapDetectionInProgress) {
      console.warn('⚠️ Significant version gap detected, performing smart catch-up', {
        incomingDocVersion,
        expectedVersion,
        gap: incomingDocVersion - expectedVersion,
        lastProcessed: currentDocVersion
      });
      
      globalState.gapDetectionInProgress = true;
      // Only show processing indicator for gap detection if not initial load
      if (!isInitialLoadRef.current) {
        setIsProcessingUpdate(true);
      }
      
      (async () => {
        try {
          const { data, error } = await supabase
            .from('rundowns')
            .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state, last_updated_by')
            .eq('id', rundownId as string)
            .single();
            
           if (!error && data) {
             const serverVersion = data.doc_version || 0;
             const serverTimestamp = normalizeTimestamp(data.updated_at);
             
             // CRITICAL FIX: Check LocalShadow protection before applying gap resolution
             const { localShadowStore } = await import('@/state/localShadows');
             const activeShadows = localShadowStore.getActiveShadows();
             
             // If user is actively editing, queue this update instead of applying immediately
             if (activeShadows.items.size > 0 || activeShadows.globals.size > 0) {
               console.log('🛡️ Gap resolution deferred - user actively editing', {
                 activeItems: activeShadows.items.size,
                 activeGlobals: activeShadows.globals.size
               });
               
               if (!globalState.itemDirtyQueue) {
                 globalState.itemDirtyQueue = [];
               }
               
               globalState.itemDirtyQueue.push({
                 payload: { new: data, table: 'rundowns' },
                 timestamp: serverTimestamp,
                 docVersion: serverVersion,
                 queuedAt: Date.now()
               });
               
               // Schedule processing when typing stops
               setTimeout(() => {
                 processQueuedUpdates(globalState);
               }, 2000);
               
               return;
             }
             
             // Only apply if server data is newer than what we're processing
             if (serverVersion >= incomingDocVersion) {
              globalState.lastProcessedTimestamp = serverTimestamp;
              globalState.lastProcessedDocVersion = serverVersion;
              
              // Apply complete server data to resolve gap
              globalState.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
                try { cb(data); } catch (err) { console.error('Error in gap resolution callback:', err); }
              });
              
              console.log('✅ Gap resolved with server data:', {
                serverVersion,
                targetVersion: incomingDocVersion
              });
            } else {
              console.warn('⚠️ Server data outdated during gap resolution, continuing with update');
              // Continue with normal processing below
            }
          } else {
            console.error('❌ Gap resolution failed:', error);
          }
        } catch (error) {
          console.error('❌ Gap resolution error:', error);
        } finally {
          globalState.gapDetectionInProgress = false;
          // Keep processing indicator active briefly for UI feedback
          setTimeout(() => {
            setIsProcessingUpdate(false);
          }, 500);
        }
      })();
      
      // If gap detection is handling it, skip normal processing
      if (hasSignificantGap) {
        return;
      }
    }

    // Determine update type with better categorization
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== JSON.stringify(payload.old?.showcaller_state);
    const hasBlueprintChanges = payload.table === 'blueprints';

    console.log('📡 Enhanced realtime update processing:', {
      type: hasBlueprintChanges ? 'blueprint' : hasShowcallerChanges && !hasContentChanges ? 'showcaller' : 'content',
      docVersion: incomingDocVersion,
      timestamp: normalizedTimestamp,
      hasGap: hasSignificantGap,
      userId: payload.new?.last_updated_by
    });
    
    // Performance monitoring and memory management
    const realtimeItemCount = (payload.new?.items as any[])?.length || 0;
    const isLargeRealtimeRundown = realtimeItemCount > 100;
    const isVeryLargeRealtimeRundown = realtimeItemCount > 200;
    
    // Memory cleanup warning for large rundowns (informational only - no functional changes)
    if (isLargeRealtimeRundown && globalSubscriptions.size > 50) {
      console.warn('⚠️ Large number of active subscriptions:', globalSubscriptions.size, 'with', realtimeItemCount, 'items');
      
      // Memory cleanup for very large rundowns (cleanup only, never skip functionality)
      if (isVeryLargeRealtimeRundown && globalSubscriptions.size > 100) {
        console.log('🧹 Performing background subscription cleanup for memory optimization');
        // Clean up old subscriptions that might be stale (but never skip current processing)
        const now = Date.now();
        for (const [key, sub] of globalSubscriptions.entries()) {
          // Skip current subscription
          if (key === rundownId) continue;
          
          // Check if subscription hasn't been used recently
          const timeSinceLastUpdate = now - (globalState.lastProcessedTimestamp ? new Date(globalState.lastProcessedTimestamp).getTime() : 0);
          if (timeSinceLastUpdate > 300000) { // 5 minutes old
            console.log('🧹 Removing stale subscription:', key);
            globalSubscriptions.delete(key);
          }
        }
      }
    }
    
    // Memory monitoring only - never skip realtime functionality
    if (isVeryLargeRealtimeRundown && typeof window !== 'undefined' && 'performance' in window && 'memory' in (window.performance as any)) {
      const memory = (window.performance as any).memory;
      const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
      
      if (usedMB > 750) {
        // Silently monitor high memory usage without console warnings
        // Note: We still process the update - just skip the warning
      }
    }

    // Update tracking state
    globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
    if (incomingDocVersion) {
      globalState.lastProcessedDocVersion = incomingDocVersion;
    }

    // MOVED: AutoSave blocking will be handled after field protection check in callbacks

    // Dispatch to appropriate callbacks with enhanced error handling
    if (hasBlueprintChanges) {
      globalState.callbacks.onBlueprintUpdate.forEach((callback: (d: any) => void) => {
        try { 
          callback(payload.new); 
        } catch (error) { 
          console.error('Error in blueprint callback:', error);
        }
      });
    } else if (hasShowcallerChanges && !hasContentChanges) {
      globalState.callbacks.onShowcallerUpdate.forEach((callback: (d: any) => void) => {
        try { 
          callback(payload.new); 
        } catch (error) { 
          console.error('Error in showcaller callback:', error);
        }
      });
    } else if (hasContentChanges) {
      // Skip content updates entirely - cell broadcasts handle real-time sync much better
      // Full realtime updates cause overwrites and conflicts with instant cell broadcasts
      console.log('📱 Skipping consolidated realtime content update (using cell broadcasts instead)', {
        docVersion: incomingDocVersion,
        timestamp: normalizedTimestamp,
        reason: 'Cell broadcasts provide superior real-time sync'
      });
      return;

      // ENHANCED DEBUG: Log all conditions for blue Wi-Fi indicator
      console.log('🔵 Blue Wi-Fi Debug: Content change detected', {
        hasContentChanges,
        isInitialLoad,
        docVersion: incomingDocVersion,
        timestamp: normalizedTimestamp,
        shouldTriggerIndicator: !isInitialLoad,
        payloadTable: payload.table,
        changedFields: ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
          .filter(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]))
      });

      // Show processing indicator ONLY for genuine remote content changes
      // Enhanced validation: not initial load AND not own update AND has real content changes
      const shouldShowBlueWifi = !isInitialLoadRef.current && hasContentChanges;
      
      if (shouldShowBlueWifi) {
        console.log('🔵 Blue Wi-Fi: TRIGGERING indicator for remote content change', {
          docVersion: incomingDocVersion,
          timestamp: normalizedTimestamp,
          hasContentChanges: true,
          tabId: payload.new?.tab_id,
          ownTabId: getTabId()
        });
        setIsProcessingUpdate(true);
        
        // Keep indicator visible for clear visibility  
        setTimeout(() => {
          console.log('🔵 Blue Wi-Fi: HIDING indicator after timeout');
          setIsProcessingUpdate(false);
        }, 1500); // Extended to 1.5s for better visibility
      } else {
        if (isInitialLoadRef.current) {
          console.log('🔵 Blue Wi-Fi: BLOCKED - initial load in progress');
        } else if (!hasContentChanges) {
          console.log('🔵 Blue Wi-Fi: BLOCKED - no content changes detected');
        }
      }
      
      try {
        // Apply LocalShadow protection before dispatching to callbacks
        const { localShadowStore } = await import('@/state/localShadows');
        const protectedPayload = localShadowStore.applyShadowsToData(payload.new);
        
        globalState.callbacks.onRundownUpdate.forEach((callback: (d: any) => void) => {
          try { 
            callback(protectedPayload); 
          } catch (error) { 
            console.error('Error in rundown callback:', error);
          }
        });
      } catch (error) {
        console.error('Error processing rundown update:', error);
      }
    }

  }, [rundownId, user?.id, isSharedView]);

  // Process queued updates when item editing stops
  const processQueuedUpdates = useCallback(async (globalState: any) => {
    if (!globalState.itemDirtyQueue || globalState.itemDirtyQueue.length === 0) {
      return;
    }
    
    const { localShadowStore } = await import('@/state/localShadows');
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Only process if no items are actively being edited
    if (activeShadows.items.size === 0) {
      console.log('🛡️ Processing queued realtime updates', {
        queueSize: globalState.itemDirtyQueue.length
      });
      
      const queuedUpdates = [...globalState.itemDirtyQueue];
      globalState.itemDirtyQueue = [];
      
      // Process each queued update
      queuedUpdates.forEach((queuedUpdate: any) => {
        try {
          processRealtimeUpdate(queuedUpdate.payload, globalState);
        } catch (error) {
          console.error('❌ Error processing queued update:', error);
        }
      });
    } else {
      console.log('🛡️ Still actively editing - keeping updates queued', {
        activeItems: Array.from(activeShadows.items.keys()),
        queueSize: globalState.itemDirtyQueue.length
      });
      
      // Re-schedule processing check
      setTimeout(() => {
        processQueuedUpdates(globalState);
      }, 1000);
    }
  }, [processRealtimeUpdate]);

  useEffect(() => {
    // For shared views, allow subscription without authentication
    if (!rundownId || (!user && !isSharedView) || !enabled) {
      return;
    }

    // Reset initial load flag for new rundown
    setIsInitialLoad(true);
    isInitialLoadRef.current = true;

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
      // Create new global subscription with enhanced state tracking
      console.log('📡 Creating enhanced consolidated realtime subscription for', rundownId);
      
      const channel = supabase
        .channel(`consolidated-realtime-${rundownId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'rundowns'
          },
          (payload) => {
            const state = globalSubscriptions.get(rundownId);
            if (state && !state.gapDetectionInProgress) {
              processRealtimeUpdate(payload, state);
            }
          }
        );

      // Also listen for blueprint changes if not shared view
      if (!isSharedView) {
        channel.on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'blueprints'
          },
          (payload) => {
            const state = globalSubscriptions.get(rundownId);
            if (state) {
              processRealtimeUpdate({ ...payload, table: 'blueprints' }, state);
            }
          }
        );
      }

      channel.subscribe(async (status) => {
        const state = globalSubscriptions.get(rundownId);
        if (!state) return;

        if (status === 'SUBSCRIBED') {
          state.isConnected = true;
          console.log('✅ Consolidated realtime connected successfully');
          // Initial catch-up: read latest row to ensure no missed updates during subscribe
          try {
            // Don't show processing indicator during initial load
            const { data, error } = await supabase
              .from('rundowns')
              .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
              .eq('id', rundownId as string)
              .single();
             if (!error && data) {
               // CRITICAL FIX: Check LocalShadow protection before applying initial catch-up
               const { localShadowStore } = await import('@/state/localShadows');
               const activeShadows = localShadowStore.getActiveShadows();
               
               // If user is actively editing, defer this initial sync
               if (activeShadows.items.size > 0 || activeShadows.globals.size > 0) {
                 console.log('🛡️ Initial catch-up deferred - user actively editing', {
                   activeItems: activeShadows.items.size,
                   activeGlobals: activeShadows.globals.size
                 });
                 
                 if (!state.itemDirtyQueue) {
                   state.itemDirtyQueue = [];
                 }
                 
                 const serverDoc = data.doc_version || 0;
                 state.itemDirtyQueue.push({
                   payload: { new: data, table: 'rundowns' },
                   timestamp: normalizeTimestamp(data.updated_at),
                   docVersion: serverDoc,
                   queuedAt: Date.now()
                 });
                 
                 // Schedule processing when typing stops
                 setTimeout(() => {
                   processQueuedUpdates(state);
                 }, 2000);
                 
                 return;
               }
               
               const serverDoc = data.doc_version || 0;
              if (serverDoc > state.lastProcessedDocVersion) {
                state.lastProcessedDocVersion = serverDoc;
                state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
                state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
                  try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
                });
              }
            } else if (error) {
              console.warn('Initial catch-up fetch failed:', error);
            }
          } finally {
            // Mark initial load as complete after first successful subscription
            setTimeout(() => {
              setIsInitialLoad(false);
              isInitialLoadRef.current = false;
            }, 100);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          state.isConnected = false;
          console.error('❌ Consolidated realtime connection failed:', status);
        } else if (status === 'CLOSED') {
          state.isConnected = false;
          console.log('🔌 Consolidated realtime connection closed');
        }
      });

      globalState = {
        subscription: channel,
        callbacks: {
          onRundownUpdate: new Set(),
          onShowcallerUpdate: new Set(),
          onBlueprintUpdate: new Set()
        },
        trackOwnUpdate: new Set(),
        ownUpdates: new Set(),
        lastProcessedTimestamp: null,
        lastProcessedDocVersion: lastSeenDocVersion,
        isConnected: false,
        refCount: 0,
        gapDetectionInProgress: false // Initialize gap detection state
      };

      globalSubscriptions.set(rundownId, globalState);
    }

    // Register callbacks
    if (callbackRefs.current.onRundownUpdate) {
      globalState.callbacks.onRundownUpdate.add(callbackRefs.current.onRundownUpdate);
    }
    if (callbackRefs.current.onShowcallerUpdate) {
      globalState.callbacks.onShowcallerUpdate.add(callbackRefs.current.onShowcallerUpdate);
    }
    if (callbackRefs.current.onBlueprintUpdate) {
      globalState.callbacks.onBlueprintUpdate.add(callbackRefs.current.onBlueprintUpdate);
    }
    if (callbackRefs.current.trackOwnUpdate) {
      globalState.trackOwnUpdate.add(callbackRefs.current.trackOwnUpdate);
    }

    globalState.refCount++;
    setIsConnected(globalState.isConnected);

    // Create local own update tracker
    const trackOwnUpdateLocal = (timestamp: string) => {
      const normalizedTimestamp = normalizeTimestamp(timestamp);
      globalState!.ownUpdates.add(normalizedTimestamp);
      
      // Notify all registered trackers
      globalState!.trackOwnUpdate.forEach(tracker => {
        try {
          tracker(timestamp);
        } catch (error) {
          console.error('Error in track own update callback:', error);
        }
      });

      // Clean up old updates after 20 seconds
      setTimeout(() => {
        globalState!.ownUpdates.delete(normalizedTimestamp);
      }, 20000);
    };

    return () => {
      const state = globalSubscriptions.get(rundownId);
      if (!state) return;

      // Unregister callbacks
      if (callbackRefs.current.onRundownUpdate) {
        state.callbacks.onRundownUpdate.delete(callbackRefs.current.onRundownUpdate);
      }
      if (callbackRefs.current.onShowcallerUpdate) {
        state.callbacks.onShowcallerUpdate.delete(callbackRefs.current.onShowcallerUpdate);
      }
      if (callbackRefs.current.onBlueprintUpdate) {
        state.callbacks.onBlueprintUpdate.delete(callbackRefs.current.onBlueprintUpdate);
      }
      if (callbackRefs.current.trackOwnUpdate) {
        state.trackOwnUpdate.delete(callbackRefs.current.trackOwnUpdate);
      }

      state.refCount--;

      // Clean up subscription if no more references
      if (state.refCount <= 0) {
        console.log('📡 Closing consolidated realtime subscription for', rundownId);
        
        // Prevent recursive cleanup
        const subscription = state.subscription;
        globalSubscriptions.delete(rundownId);
        
        // Safe async cleanup
        setTimeout(() => {
          try {
            supabase.removeChannel(subscription);
          } catch (error) {
            console.warn('📡 Error during consolidated cleanup:', error);
          }
        }, 0);
      }

      setIsConnected(false);
    };
  }, [rundownId, user?.id, enabled, processRealtimeUpdate, isSharedView]);

  // Sync lastSeenDocVersion into global state without resubscribing
  useEffect(() => {
    if (!rundownId) return;
    const state = globalSubscriptions.get(rundownId);
    if (state && lastSeenDocVersion > state.lastProcessedDocVersion) {
      state.lastProcessedDocVersion = lastSeenDocVersion;
    }
  }, [rundownId, lastSeenDocVersion]);

  // SIMPLIFIED: No longer track timestamps, rely only on tab_id
  const trackOwnUpdateFunc = useCallback((timestamp: string) => {
    // Keep for backward compatibility but don't track timestamps
  }, []);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateFunc,
    tabId: 'single-session', // Single session - no tab tracking needed
    // Legacy compatibility methods (no-ops maintained)
    setTypingChecker: (checker: any) => {},
    setUnsavedChecker: (checker: any) => {},
    performCatchupSync: async () => {
      const state = globalSubscriptions.get(rundownId || '');
      if (!rundownId || !state) return;
      try {
        // Manual catch-up sync should show processing indicator (not initial load)
        setIsProcessingUpdate(true);
        const { data, error } = await supabase
          .from('rundowns')
          .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
          .eq('id', rundownId)
          .single();
        if (!error && data) {
          const serverDoc = data.doc_version || 0;
          if (serverDoc >= state.lastProcessedDocVersion) {
            state.lastProcessedDocVersion = serverDoc;
            state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
            state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
              try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
            });
          }
        } else if (error) {
          console.warn('Manual catch-up fetch failed:', error);
        }
        } finally {
          // Keep processing indicator active briefly for UI feedback  
          setTimeout(() => {
            setIsProcessingUpdate(false);
          }, 500);
        }
    }
  };
};
