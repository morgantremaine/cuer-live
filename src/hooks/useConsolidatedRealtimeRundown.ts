import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';
import { unifiedConnectionHealth } from '@/services/UnifiedConnectionHealth';
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
  hasPendingUpdates?: () => boolean;
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
  reconnectAttempts?: number;
  reconnectTimeout?: NodeJS.Timeout;
  guardTimeout?: NodeJS.Timeout; // Track guard timeout to clear on success
  reconnectHandler?: () => Promise<void>;
  reconnecting?: boolean; // Guard against reconnection storms
  reconnectingStartedAt?: number; // Track when reconnection started
  lastReconnectTime?: number; // Debounce rapid reconnections
}>();

// Minimum interval between reconnection attempts (prevents storm)
const MIN_RECONNECT_INTERVAL = 5000; // 5 seconds

// Reconnection helper with exponential backoff and debouncing
const handleConsolidatedChannelReconnect = (rundownId: string) => {
  const state = globalSubscriptions.get(rundownId);
  if (!state) return;

  // CRITICAL: Debounce rapid reconnection attempts
  const now = Date.now();
  const timeSinceLastReconnect = now - (state.lastReconnectTime || 0);
  if (timeSinceLastReconnect < MIN_RECONNECT_INTERVAL) {
    console.log(`⏭️ Skipping reconnection - too soon (${Math.round(timeSinceLastReconnect/1000)}s since last)`);
    return;
  }

  // Set guard flag immediately to prevent feedback loop
  state.reconnecting = true;
  state.lastReconnectTime = now;

  // Clear any existing reconnect timeout
  if (state.reconnectTimeout) {
    clearTimeout(state.reconnectTimeout);
    state.reconnectTimeout = undefined;
  }

  const attempts = state.reconnectAttempts || 0;
  state.reconnectAttempts = attempts + 1;

  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const delay = Math.min(1000 * Math.pow(2, attempts), 30000);

  console.log(`📡 Reconnecting in ${delay}ms (attempt ${attempts + 1})`);

  state.reconnectTimeout = setTimeout(() => {
    state.reconnectTimeout = undefined;
    if (state.reconnectHandler) {
      state.reconnectHandler();
    }
  }, delay);
};

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  lastSeenDocVersion = 0,
  isSharedView = false,
  blockUntilLocalEditRef,
  hasPendingUpdates
}: UseConsolidatedRealtimeRundownProps) => {
  const { user, tokenReady } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);
  const initialLoadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastCatchupAttemptRef = useRef<number>(0);
  const MIN_CATCHUP_INTERVAL = 15000; // 15 seconds minimum between catch-ups

  // Quick version check - lightweight pre-check before full sync
  const performQuickVersionCheck = useCallback(async (): Promise<{ needsSync: boolean; serverVersion?: number }> => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return { needsSync: false };
    
    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('doc_version, updated_at')
        .eq('id', rundownId)
        .single();
      
      if (!error && data) {
        const serverDoc = data.doc_version || 0;
        const needsSync = serverDoc > state.lastProcessedDocVersion;
        
        console.log('⚡ Quick version check:', {
          serverVersion: serverDoc,
          lastKnownVersion: state.lastProcessedDocVersion,
          needsSync
        });
        
        return { needsSync, serverVersion: serverDoc };
      }
    } catch (error) {
      console.warn('⚠️ Quick version check failed:', error);
    }
    
    return { needsSync: false };
  }, [rundownId]);

  // Define performCatchupSync before it's used in handleOnline
  const performCatchupSync = useCallback(async (options?: { skipFailedOpsCheck?: boolean }): Promise<boolean> => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return false;
    
    // Debounce: Don't allow catch-ups more than once every 15 seconds
    const now = Date.now();
    const timeSinceLastCatchup = now - lastCatchupAttemptRef.current;
    
    if (timeSinceLastCatchup < MIN_CATCHUP_INTERVAL) {
      console.log(`⏱️ Skipping catch-up sync - too soon (${Math.round(timeSinceLastCatchup/1000)}s since last attempt)`);
      return false;
    }
    
    lastCatchupAttemptRef.current = now;
    
    // CRITICAL: Check for pending updates from cell-level saves FIRST
    // Block catch-up sync if there are pending changes to prevent data loss
    if (hasPendingUpdates?.()) {
      debugLogger.realtime('⚠️ Blocking catch-up sync - pending cell updates exist');
      return false;
    }
    
    // CRITICAL: Also check for failed cell saves in localStorage (from previous session)
    // This closes the edge case where page reloads with pending failed cell saves
    if (!options?.skipFailedOpsCheck) {
      try {
        const cellSavesKey = `rundown_failed_saves_${rundownId}`;
        const storedFailedCellSaves = localStorage.getItem(cellSavesKey);
        
        if (storedFailedCellSaves) {
          const failedCellSaves = JSON.parse(storedFailedCellSaves);
          if (failedCellSaves.length > 0) {
            console.warn(`⚠️ Blocking catch-up sync - ${failedCellSaves.length} failed cell saves pending from previous session`);
            return false; // Block sync - let retry mechanism handle these first
          }
        }
      } catch (error) {
        console.error('Error checking failed cell saves:', error);
      }
    }
    
    // CRITICAL: Check for pending failed structural operations
    // Don't overwrite local state that contains unsaved changes
    if (!options?.skipFailedOpsCheck) {
      try {
        const storageKey = `rundown_failed_operations_${rundownId}`;
        const storedFailedOps = localStorage.getItem(storageKey);
        
        if (storedFailedOps) {
          const failedOps = JSON.parse(storedFailedOps);
          if (failedOps.length > 0) {
            console.warn(`⚠️ Skipping catch-up sync - ${failedOps.length} failed structural operations pending`);
            toast.warning('Sync Paused', {
              description: `${failedOps.length} unsaved change${failedOps.length > 1 ? 's' : ''} detected. Please check your connection.`,
              duration: 5000
            });
            return false; // Don't sync - preserve local state
          }
        }
      } catch (error) {
        console.error('Error checking failed operations:', error);
      }
    }
    
    try {
      // Step 1: Quick version check first (50ms vs 500ms)
      const versionCheck = await performQuickVersionCheck();
      if (!versionCheck.needsSync) {
        console.log('✅ Quick check: No updates needed');
        return false; // No updates found
      }
      
      // Step 2: Only do full sync if version check shows updates
      setIsProcessingUpdate(true);
      
      const knownDocVersion = state.lastProcessedDocVersion;
      const offlineDuration = state.offlineSince ? Date.now() - state.offlineSince : 0;
      
      console.log('🔄 Catch-up sync: fetching latest rundown data', {
        lastKnownVersion: knownDocVersion,
        offlineDurationMs: offlineDuration
      });
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state, tab_id')
        .eq('id', rundownId)
        .single();
        
      if (!error && data) {
        const serverDoc = data.doc_version || 0;
        const currentTabId = getTabId();
        const isOwnUpdate = data.tab_id === currentTabId;
        
        // Only count as "missed" if from a different tab
        const missedUpdates = isOwnUpdate ? 0 : Math.max(0, serverDoc - knownDocVersion);
        
        console.log('🔄 Catch-up sync result:', {
          serverVersion: serverDoc,
          lastKnownVersion: knownDocVersion,
          fromSameTab: isOwnUpdate,
          missedUpdates
        });
        
        if (serverDoc > knownDocVersion) {
          state.lastProcessedDocVersion = serverDoc;
          state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
          state.offlineSince = undefined; // Clear offline timestamp
          
          // Only apply callback if from different tab (avoid re-processing own updates)
          if (!isOwnUpdate) {
            state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
              try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
            });
          }
          
          // FIXED: Only show toast for actual missed updates from OTHER users/tabs
          // AND only after initial load is complete (not when first opening the rundown)
          if (missedUpdates > 0 && !isInitialLoadRef.current) {
            toast.info(`Synced ${missedUpdates} update${missedUpdates > 1 ? 's' : ''} from other users`);
          } else if (serverDoc > knownDocVersion) {
            console.log(`✅ Caught up with ${serverDoc - knownDocVersion} operation(s) - no toast needed`);
          }
          return true; // Updates were found and applied
        } else {
          console.log('✅ No missed updates - already up to date');
          return false; // No updates
        }
      } else if (error) {
        console.warn('❌ Manual catch-up fetch failed:', error);
        return false;
      }
    } finally {
      // Keep processing indicator active briefly for UI feedback  
      setTimeout(() => {
        setIsProcessingUpdate(false);
      }, 500);
    }
    return false;
  }, [rundownId, performQuickVersionCheck]);

  // Track actual channel connection status from globalSubscriptions + browser network
  useEffect(() => {
    if (!enabled || !rundownId) {
      setIsConnected(false);
      return;
    }

    // Immediate browser-level network detection with catch-up sync
    const handleOnline = async () => {
      console.log('📶 Browser detected network online - waiting for Supabase reconnection...');
      
      // Wait up to 15 seconds for Supabase to reconnect, checking every 500ms
      let retries = 0;
      const maxRetries = 30; // 30 * 500ms = 15 seconds
      
      while (retries < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500));
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
          return;
        }
        retries++;
      }
      
      console.warn('⏳ Supabase still not connected after 15s - catch-up sync will run when connection is established');
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
  }, [enabled, rundownId, performCatchupSync]);

  // Trigger catch-up sync when connection is restored (NOT on initial load)
  // CRITICAL FIX: Wait for all channels to stabilize before catch-up sync
  const wasConnectedRef = useRef(isConnected);
  useEffect(() => {
    // FIXED: Skip during initial load - initial data already fetched in subscribe callback
    if (isConnected && !wasConnectedRef.current && rundownId && !isInitialLoadRef.current) {
      console.log('📡 Connection restored - waiting for channel stabilization before catch-up sync...');
      
      // Update unified health service
      unifiedConnectionHealth.setConsolidatedStatus(rundownId, true);
      
      // Wait for all channels to stabilize before syncing
      const performStabilizedSync = async () => {
        const stabilized = await unifiedConnectionHealth.waitForStabilization(rundownId, 5000);
        
        if (stabilized) {
          console.log('✅ All channels healthy - performing catch-up sync');
          unifiedConnectionHealth.resetFailures(rundownId);
          await performCatchupSync();
        } else {
          console.warn('⚠️ Some channels still unhealthy - deferring catch-up sync for 10 seconds');
          // Schedule retry after 10 more seconds
          setTimeout(async () => {
            const nowStabilized = unifiedConnectionHealth.areAllChannelsHealthy(rundownId);
            if (nowStabilized) {
              console.log('✅ Delayed check: All channels now healthy - performing catch-up sync');
              unifiedConnectionHealth.resetFailures(rundownId);
            } else {
              console.warn('⚠️ Delayed check: Still unhealthy - performing catch-up sync anyway');
            }
            await performCatchupSync();
          }, 10000);
        }
      };
      
      performStabilizedSync();
    } else if (!isConnected && wasConnectedRef.current && rundownId) {
      // Connection lost
      unifiedConnectionHealth.setConsolidatedStatus(rundownId, false);
      unifiedConnectionHealth.trackFailure(rundownId);
    }
    wasConnectedRef.current = isConnected;
  }, [isConnected, performCatchupSync, rundownId]);

  // Simplified polling fallback - only catch up when genuinely needed
  useEffect(() => {
    if (!enabled || !rundownId) {
      return;
    }
    
    const checkInterval = setInterval(async () => {
      const state = globalSubscriptions.get(rundownId);
      if (!state) return;
      
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const STALE_THRESHOLD = 600000; // 10 minutes (safety net only)
      
      // Only catch up if:
      // 1. WebSocket is disconnected OR
      // 2. WebSocket connected but no updates for 10+ minutes (rare edge case)
      if (!state.isConnected) {
        console.log('🔄 WebSocket disconnected - performing catch-up sync');
        await performCatchupSync();
      } else if (timeSinceLastUpdate > STALE_THRESHOLD) {
        debugLogger.realtime('WebSocket connected but no updates for 10m - checking for stale data');
        const hadUpdates = await performCatchupSync();
        if (!hadUpdates) {
          lastUpdateTimeRef.current = Date.now(); // Reset timer
        }
      }
    }, 30000); // Check every 30 seconds for faster detection
    
    return () => clearInterval(checkInterval);
  }, [enabled, rundownId, isConnected, performCatchupSync]);
  
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
    
    // Track update time for polling fallback
    lastUpdateTimeRef.current = Date.now();

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

    // Reset initial load flag for new rundown
    setIsInitialLoad(true);
    isInitialLoadRef.current = true;

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
      // Create new global subscription with enhanced state tracking
      
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

        // Guard: Skip if already reconnecting to prevent feedback loop
        if (state.reconnecting && status !== 'SUBSCRIBED') {
          console.log('⏭️ Reconnection in progress:', {
            rundownId,
            status,
            reconnectAttempts: state.reconnectAttempts
          });
          
          // Safety: If stuck in reconnecting for >60s, force clear
          if (!state.reconnectingStartedAt) {
            state.reconnectingStartedAt = Date.now();
          } else if (Date.now() - state.reconnectingStartedAt > 60000) {
            console.error('🚨 Reconnection stuck for >60s - force clearing flag');
            state.reconnecting = false;
            state.reconnectingStartedAt = undefined;
          } else {
            return; // Skip this attempt
          }
        }

        if (status === 'SUBSCRIBED') {
          state.isConnected = true;
          // CRITICAL: Clear ALL pending timeouts and flags on success
          state.reconnecting = false;
          state.reconnectingStartedAt = undefined;
          state.reconnectAttempts = 0;
          if (state.reconnectTimeout) {
            clearTimeout(state.reconnectTimeout);
            state.reconnectTimeout = undefined;
          }
          if (state.guardTimeout) {
            clearTimeout(state.guardTimeout);
            state.guardTimeout = undefined;
          }
          
          // Update unified health service - consolidated is now connected
          unifiedConnectionHealth.setConsolidatedStatus(rundownId, true);
          
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
              
              debugLogger.realtime('Initial load gate cleared - realtime updates enabled');
            } else if (error) {
              console.warn('Initial catch-up fetch failed:', error);
              // Fallback: Clear gate after timeout if fetch fails
              initialLoadTimeoutRef.current = setTimeout(() => {
                setIsInitialLoad(false);
                isInitialLoadRef.current = false;
                initialLoadTimeoutRef.current = null;
                debugLogger.realtime('Initial load gate cleared (fallback) - realtime updates enabled');
              }, 2000);
            }
          } catch (err) {
            console.error('Initial catch-up error:', err);
            // Fallback: Clear gate after timeout on error
            initialLoadTimeoutRef.current = setTimeout(() => {
              setIsInitialLoad(false);
              isInitialLoadRef.current = false;
              initialLoadTimeoutRef.current = null;
              debugLogger.realtime('Initial load gate cleared (error fallback) - realtime updates enabled');
            }, 2000);
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          state.isConnected = false;
          state.reconnecting = false; // CRITICAL: Clear flag on error
          console.error('❌ Consolidated realtime connection failed:', status);
          
          // Track failure in unified health service
          unifiedConnectionHealth.setConsolidatedStatus(rundownId, false);
          unifiedConnectionHealth.trackFailure(rundownId);
          
          // Direct reconnection with exponential backoff
          handleConsolidatedChannelReconnect(rundownId);
        } else if (status === 'CLOSED') {
          state.isConnected = false;
          state.reconnecting = false; // CRITICAL: Clear flag on close
          console.log('🔌 Consolidated realtime connection closed');
          
          // Track in unified health service
          unifiedConnectionHealth.setConsolidatedStatus(rundownId, false);
          unifiedConnectionHealth.trackFailure(rundownId); // CRITICAL: Track failure for CLOSED status
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
        refCount: 0,
        reconnectAttempts: 0
      };

      globalSubscriptions.set(rundownId, globalState);
      
      // Define and register reconnection handler
      reconnectHandler = async () => {
        console.log('📡 🔄 Force reconnect requested for consolidated channel:', rundownId);
        
        // CRITICAL: Debounce rapid reconnection attempts
        if (globalState) {
          const now = Date.now();
          const timeSinceLastReconnect = now - (globalState.lastReconnectTime || 0);
          if (timeSinceLastReconnect < MIN_RECONNECT_INTERVAL) {
            console.log(`⏭️ Skipping force reconnect - too soon (${Math.round(timeSinceLastReconnect/1000)}s since last)`);
            return;
          }
          globalState.lastReconnectTime = now;
          globalState.reconnecting = true;
          
          // Clear existing guard timeout before setting new one
          if (globalState.guardTimeout) {
            clearTimeout(globalState.guardTimeout);
          }
          
          // CRITICAL: Auto-clear flag after 30 seconds if reconnection doesn't complete
          globalState.guardTimeout = setTimeout(() => {
            if (globalState && globalState.reconnecting) {
              console.warn('⏰ Reconnection guard timeout - force clearing flag');
              globalState.reconnecting = false;
              globalState.reconnectingStartedAt = undefined;
              globalState.guardTimeout = undefined;
              // Report timeout as a failure to unified health tracking
              unifiedConnectionHealth.trackFailure(rundownId);
            }
          }, 30000); // 30 second timeout
        }
        
        // Check auth first
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error || !session) {
          console.warn('📡 ⚠️ Cannot reconnect - invalid auth session');
          if (globalState) {
            globalState.reconnecting = false; // Clear flag on auth failure
          }
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
          
          await newChannel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
              if (globalState) {
                globalState.isConnected = true;
                globalState.reconnecting = false;
                globalState.reconnectAttempts = 0;
                // CRITICAL: Clear ALL pending timeouts on success
                if (globalState.reconnectTimeout) {
                  clearTimeout(globalState.reconnectTimeout);
                  globalState.reconnectTimeout = undefined;
                }
                if (globalState.guardTimeout) {
                  clearTimeout(globalState.guardTimeout);
                  globalState.guardTimeout = undefined;
                }
              }
              // Update unified health service
              unifiedConnectionHealth.setConsolidatedStatus(rundownId, true);
              console.log('📡 Force reconnection successful - catch-up sync handled by wasConnectedRef effect');
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
              if (globalState) {
                globalState.isConnected = false;
                globalState.reconnecting = false;
              }
              // Update unified health service with failure
              unifiedConnectionHealth.setConsolidatedStatus(rundownId, false);
              unifiedConnectionHealth.trackFailure(rundownId);
              // Trigger backoff retry
              handleConsolidatedChannelReconnect(rundownId);
            }
          });
          
          if (globalState) {
            globalState.subscription = newChannel;
          }
        }
      };
      
      // Store handler in state for reconnection
      globalState.reconnectHandler = reconnectHandler;
    } else {
      // Existing subscription - reset reconnect attempts on successful status change
      if (globalState.isConnected) {
        globalState.reconnectAttempts = 0;
      }
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
        
        // Clear any pending timeouts
        if (state.reconnectTimeout) {
          clearTimeout(state.reconnectTimeout);
        }
        if (state.guardTimeout) {
          clearTimeout(state.guardTimeout);
        }
        
        // CRITICAL: Cleanup unified health service
        unifiedConnectionHealth.cleanup(rundownId);
        
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
