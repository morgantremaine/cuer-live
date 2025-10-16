import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { realtimeReconnectionCoordinator } from '@/services/RealtimeReconnectionCoordinator';
import { toast } from 'sonner';

interface UseConsolidatedRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  lastSeenDocVersion?: number;
  isSharedView?: boolean;
  blockUntilLocalEditRef?: React.MutableRefObject<boolean>;
}

// Simplified global subscription state
const globalSubscriptions = new Map<string, {
  subscription: any;
  callbacks: {
    onRundownUpdate: Set<(data: any) => void>;
    onShowcallerUpdate: Set<(data: any) => void>;
    onBlueprintUpdate: Set<(data: any) => void>;
  };
  lastProcessedTimestamp: string | null;
  lastProcessedDocVersion: number;
  isConnected: boolean;
  refCount: number;
  offlineSince?: number;
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  lastSeenDocVersion = 0,
  isSharedView = false,
  blockUntilLocalEditRef
}: UseConsolidatedRealtimeRundownProps) => {
  const { user, tokenReady } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);
  const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Define performCatchupSync before it's used in handleOnline
  const performCatchupSync = useCallback(async () => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return;
    try {
      // Manual catch-up sync should show processing indicator (not initial load)
      setIsProcessingUpdate(true);
      
      const knownDocVersion = state.lastProcessedDocVersion;
      const offlineDuration = state.offlineSince ? Date.now() - state.offlineSince : 0;
      
      console.log('🔄 Catch-up sync: fetching latest rundown data', {
        lastKnownVersion: knownDocVersion,
        offlineDurationMs: offlineDuration
      });
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
        .eq('id', rundownId)
        .single();
        
      if (!error && data) {
        const serverDoc = data.doc_version || 0;
        const missedUpdates = Math.max(0, serverDoc - knownDocVersion);
        
        console.log('🔄 Catch-up sync result:', {
          serverVersion: serverDoc,
          lastKnownVersion: knownDocVersion,
          missedUpdates
        });
        
        if (serverDoc > knownDocVersion) {
          state.lastProcessedDocVersion = serverDoc;
          state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
          state.offlineSince = undefined; // Clear offline timestamp
          
          state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
            try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
          });
          
          // Show user notification if updates were synced
          if (missedUpdates > 0) {
            toast.info(`Synced ${missedUpdates} update${missedUpdates > 1 ? 's' : ''} made while offline`);
          }
        } else {
          console.log('✅ No missed updates - already up to date');
        }
      } else if (error) {
        console.warn('❌ Manual catch-up fetch failed:', error);
      }
    } finally {
      // Keep processing indicator active briefly for UI feedback  
      setTimeout(() => {
        setIsProcessingUpdate(false);
      }, 500);
    }
  }, [rundownId]);

  // Track actual channel connection status from globalSubscriptions + browser network
  useEffect(() => {
    if (!enabled || !rundownId) {
      setIsConnected(false);
      return;
    }

    // Immediate browser-level network detection with catch-up sync
    const handleOnline = async () => {
      console.log('📶 Browser detected network online - waiting for Supabase reconnection...');
      
      // Wait 1.5s for Supabase channels to reconnect
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const state = globalSubscriptions.get(rundownId);
      if (state?.isConnected) {
        console.log('📶 Supabase connected - validating session...');
        
        // CRITICAL: Validate session before processing offline data
        const { authMonitor } = await import('@/services/AuthMonitor');
        const isSessionValid = await authMonitor.isSessionValid();
        
        if (!isSessionValid) {
          console.warn('🔐 Session expired - cannot process offline queue');
          toast.error('Session expired. Please log in to sync your changes.', {
            duration: 10000,
            action: {
              label: 'Refresh',
              onClick: () => window.location.reload()
            }
          });
          setIsConnected(false); // Keep disconnected state to prevent queue processing
          return;
        }
        
        console.log('📶 Session valid - performing catch-up sync');
        
        // FIRST: Fetch latest data from server (catch-up sync)
        await performCatchupSync();
        
        // SECOND: Set connected to trigger offline queue processing
        setIsConnected(true);
        
        console.log('✅ Reconnection complete: catch-up synced + offline queue will process');
      } else {
        console.log('⏳ Supabase not yet reconnected, will retry...');
      }
    };
    
    const handleOffline = () => {
      console.log('📵 Browser reported offline (may be false)');
      
      // Don't immediately trust navigator.onLine
      // Wait 2s and verify with actual Supabase session check
      setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (!error && data.session) {
            console.log('✅ Auth check passed despite offline report - ignoring false offline');
            return; // Network is actually fine
          }
        } catch {
          // Network truly offline
          console.log('📵 Confirmed network offline via auth check');
          setIsConnected(false);
          const state = globalSubscriptions.get(rundownId);
          if (state) {
            state.isConnected = false;
            state.offlineSince = Date.now();
            console.log('📵 Marked offline at:', new Date(state.offlineSince).toISOString());
          }
        }
      }, 2000);
    };
    
    // Listen to browser network events for instant detection
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check initial browser network status
    if (!navigator.onLine) {
      setIsConnected(false);
    }

    // Check connection status from global state
    const checkConnection = () => {
      // If browser is offline, always show disconnected
      if (!navigator.onLine) {
        setIsConnected(false);
        return;
      }
      
      const state = globalSubscriptions.get(rundownId);
      setIsConnected(state?.isConnected || false);
    };

    // Initial check
    checkConnection();

    // Poll for connection status updates every 500ms (backup)
    const interval = setInterval(checkConnection, 500);

    return () => {
      clearInterval(interval);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, rundownId]);
  
  // Simplified callback refs (no tab coordination needed)
  const callbackRefs = useRef({
    onRundownUpdate,
    onShowcallerUpdate,
    onBlueprintUpdate
  });

  // Keep refs updated
  callbackRefs.current = {
    onRundownUpdate,
    onShowcallerUpdate,
    onBlueprintUpdate
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

    // SIMPLIFIED: No gap detection - just apply all updates immediately (Google Sheets style)
    // Let per-cell saves handle conflicts at database level
    // "Last write wins" for concurrent editing - simple and predictable

    // Determine update type with better categorization
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== JSON.stringify(payload.old?.showcaller_state);
    const hasBlueprintChanges = payload.table === 'blueprints';

    console.log('📡 Enhanced realtime update processing:', {
      type: hasBlueprintChanges ? 'blueprint' : hasShowcallerChanges && !hasContentChanges ? 'showcaller' : 'content',
      docVersion: incomingDocVersion,
      timestamp: normalizedTimestamp,
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
      // Check broadcast health and use fallback if needed
      const { cellBroadcast } = await import('@/utils/cellBroadcast');
      const isBroadcastHealthy = cellBroadcast.isBroadcastHealthy(rundownId);
      
      if (isBroadcastHealthy) {
        console.log('📱 Using cell broadcasts for content sync', {
          docVersion: incomingDocVersion,
          timestamp: normalizedTimestamp,
          reason: 'Broadcast system healthy'
        });
        return;
      } else {
        // Use database fallback when broadcast health is poor
        console.log('🔄 Using database fallback due to poor broadcast health', {
          docVersion: incomingDocVersion,
          timestamp: normalizedTimestamp,
          healthMetrics: cellBroadcast.getHealthMetrics(rundownId)
        });
        
        globalState.callbacks.onRundownUpdate.forEach((callback: (d: any) => void) => {
          try { 
            callback(payload.new); 
          } catch (error) { 
            console.error('Error in fallback rundown callback:', error);
          }
        });
      }
    }

  }, [rundownId, user?.id, isSharedView]);

  // REMOVED: processQueuedUpdates - no longer needed with simplified approach

  useEffect(() => {
    // For shared views, allow subscription without authentication
    // For authenticated users, wait for token to be ready
    if (!rundownId || (!user && !isSharedView) || !enabled) {
      return;
    }

    if (user && !tokenReady) {
      console.log('📡 Waiting for token to be ready before connecting to realtime...');
      return;
    }

    console.log('📡 Token ready, creating consolidated realtime subscription');

    // Reset initial load flag for new rundown
    setIsInitialLoad(true);
    isInitialLoadRef.current = true;

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
      // Create new global subscription with enhanced state tracking
      console.log('📡 Creating enhanced consolidated realtime subscription for', rundownId);
      
      // Define reconnect handler that will be set later
      let reconnectHandler: (() => Promise<void>) | null = null;
      
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
            if (state) {
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
               // SIMPLIFIED: Apply initial catch-up immediately
               const serverDoc = data.doc_version || 0;
              if (serverDoc > state.lastProcessedDocVersion) {
                state.lastProcessedDocVersion = serverDoc;
                state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
                state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
                  try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
                });
              }
              
              // FIXED: Clear initial load gate IMMEDIATELY after successful data fetch
              setIsInitialLoad(false);
              isInitialLoadRef.current = false;
              if (initialLoadTimeoutRef.current) {
                clearTimeout(initialLoadTimeoutRef.current);
                initialLoadTimeoutRef.current = null;
              }
              console.log('🚪 Initial load gate cleared - realtime updates enabled');
            } else if (error) {
              console.warn('Initial catch-up fetch failed:', error);
              // Fallback: Clear gate after timeout if fetch fails
              initialLoadTimeoutRef.current = setTimeout(() => {
                setIsInitialLoad(false);
                isInitialLoadRef.current = false;
                initialLoadTimeoutRef.current = null;
                console.log('🚪 Initial load gate cleared (fallback) - realtime updates enabled');
              }, 2000);
            }
          } catch (err) {
            console.error('Initial catch-up error:', err);
            // Fallback: Clear gate after timeout on error
            initialLoadTimeoutRef.current = setTimeout(() => {
              setIsInitialLoad(false);
              isInitialLoadRef.current = false;
              initialLoadTimeoutRef.current = null;
              console.log('🚪 Initial load gate cleared (error fallback) - realtime updates enabled');
            }, 2000);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          state.isConnected = false;
          console.error('❌ Consolidated realtime connection failed:', status);
          
          // Notify coordinator of channel error
          realtimeReconnectionCoordinator.handleChannelError(`consolidated-${rundownId}`);
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
        lastProcessedTimestamp: null,
        lastProcessedDocVersion: lastSeenDocVersion,
        isConnected: false,
        refCount: 0
      };

      globalSubscriptions.set(rundownId, globalState);
      
      // Define and register reconnection handler
      reconnectHandler = async () => {
        console.log('📡 🔄 Force reconnect requested for consolidated channel:', rundownId);
        
        // Check auth first
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.warn('📡 ⚠️ Cannot reconnect - invalid auth session');
          return;
        }
        
        // Unsubscribe and resubscribe
        if (globalState?.subscription) {
          await supabase.removeChannel(globalState.subscription);
          const newChannel = supabase.channel(`consolidated-realtime-${rundownId}`);
          
          // Re-setup listeners (copy from above)
          newChannel.on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'rundowns'
          }, (payload) => {
            const state = globalSubscriptions.get(rundownId);
            if (state) processRealtimeUpdate(payload, state);
          });
          
          if (!isSharedView) {
            newChannel.on('postgres_changes', {
              event: 'UPDATE',
              schema: 'public',
              table: 'blueprints'
            }, (payload) => {
              const state = globalSubscriptions.get(rundownId);
              if (state) processRealtimeUpdate({ ...payload, table: 'blueprints' }, state);
            });
          }
          
          await newChannel.subscribe();
          if (globalState) {
            globalState.subscription = newChannel;
          }
        }
      };
      
      realtimeReconnectionCoordinator.register(
        `consolidated-${rundownId}`,
        'consolidated',
        reconnectHandler
      );
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

    globalState.refCount++;
    setIsConnected(globalState.isConnected);

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

      state.refCount--;
      
      // FIXED: Validate and auto-correct refCount desync
      if (state.refCount < 0) {
        console.error('🚨 CRITICAL: refCount went negative! Auto-correcting...', {
          rundownId,
          refCount: state.refCount,
          callbacks: {
            onRundownUpdate: state.callbacks.onRundownUpdate.size,
            onShowcallerUpdate: state.callbacks.onShowcallerUpdate.size,
            onBlueprintUpdate: state.callbacks.onBlueprintUpdate.size
          }
        });
        state.refCount = 0; // Force correction
      }

      // Calculate total callbacks as secondary source of truth
      const totalCallbacks = 
        state.callbacks.onRundownUpdate.size + 
        state.callbacks.onShowcallerUpdate.size + 
        state.callbacks.onBlueprintUpdate.size;

      // Clean up subscription if no more references AND no active callbacks
      if (state.refCount <= 0 && totalCallbacks === 0) {
        console.log('📡 Closing consolidated realtime subscription for', rundownId, {
          refCount: state.refCount,
          totalCallbacks
        });
        
        // Unregister from reconnection coordinator
        realtimeReconnectionCoordinator.unregister(`consolidated-${rundownId}`);
        
        // Prevent recursive cleanup
        const subscription = state.subscription;
        globalSubscriptions.delete(rundownId);
        
        // Safe async cleanup - guard against recursive calls during global reconnection
        setTimeout(() => {
          try {
            // Check if we're in a global WebSocket reconnection
            const isGlobalReconnecting = (globalThis as any)._isGlobalReconnecting;
            
            if (isGlobalReconnecting) {
              console.log('📡 Skipping channel removal during global WebSocket reconnection');
            } else {
              supabase.removeChannel(subscription);
            }
          } catch (error) {
            console.warn('📡 Error during consolidated cleanup:', error);
          }
        }, 0);
      } else if (state.refCount <= 0 && totalCallbacks > 0) {
        // FIXED: Correct refCount if callbacks still exist but refCount is 0
        console.warn('⚠️ refCount mismatch detected - correcting', {
          oldRefCount: state.refCount,
          totalCallbacks,
          newRefCount: totalCallbacks
        });
        state.refCount = totalCallbacks;
      }

      // Clear initial load timeout on unmount
      if (initialLoadTimeoutRef.current) {
        clearTimeout(initialLoadTimeoutRef.current);
        initialLoadTimeoutRef.current = null;
      }

      setIsConnected(false);
    };
  }, [rundownId, user?.id, tokenReady, enabled, processRealtimeUpdate, isSharedView]);

  // Sync lastSeenDocVersion into global state without resubscribing
  useEffect(() => {
    if (!rundownId) return;
    const state = globalSubscriptions.get(rundownId);
    if (state && lastSeenDocVersion > state.lastProcessedDocVersion) {
      state.lastProcessedDocVersion = lastSeenDocVersion;
    }
  }, [rundownId, lastSeenDocVersion]);

  // SIMPLIFIED: No longer track timestamps, rely only on tab_id
  // Legacy compatibility function - now directly uses centralized tracker
  const trackOwnUpdateFunc = useCallback((timestamp: string) => {
    if (rundownId) {
      const context = `realtime-${rundownId}`;
      ownUpdateTracker.track(normalizeTimestamp(timestamp), context);
      console.log('🏷️ Tracked own update via centralized tracker:', timestamp);
    }
  }, [rundownId]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateFunc,
    tabId: 'single-session', // Single session - no tab tracking needed
    // Legacy compatibility methods (no-ops maintained)
    setTypingChecker: (checker: any) => {},
    setUnsavedChecker: (checker: any) => {},
    performCatchupSync
  };
};
