// Consolidated Realtime Rundown Hook - NUCLEAR RESET VERSION
// Simple channel management with nuclear reset for extended sleep recovery
// No complex retry logic - just connect, and use nuclear reset if needed

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';
import { realtimeReset } from '@/utils/realtimeReset';
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
  skipShowcallerInHealthCheck?: boolean; // For views that don't use showcaller channel (teleprompter, AD view)
}

// Simple global subscription state
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
  generation: number; // Generation tracking to ignore stale callbacks
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  lastSeenDocVersion = 0,
  isSharedView = false,
  blockUntilLocalEditRef,
  hasPendingUpdates,
  skipShowcallerInHealthCheck = false
}: UseConsolidatedRealtimeRundownProps) => {
  const { user, tokenReady } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const lastCatchupAttemptRef = useRef<number>(0);
  const performCatchupSyncRef = useRef<(forceSync?: boolean) => Promise<boolean>>();
  const MIN_CATCHUP_INTERVAL = 15000;

  // Catch-up sync - fetch latest data from database
  const performCatchupSync = useCallback(async (forceSync: boolean = false): Promise<boolean> => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return false;

    const now = Date.now();
    if (!forceSync && now - lastCatchupAttemptRef.current < MIN_CATCHUP_INTERVAL) {
      console.log('⏱️ Skipping catch-up sync - too soon (last attempt:', Math.round((now - lastCatchupAttemptRef.current) / 1000), 's ago)');
      return false;
    }
    lastCatchupAttemptRef.current = now;

    // Block if pending updates
    if (hasPendingUpdates?.()) {
      console.log('⚠️ Blocking catch-up sync - pending updates exist');
      return false;
    }

    console.log('🔄 Performing catch-up sync for rundown:', rundownId);

    try {
      setIsProcessingUpdate(true);

      const { data, error } = await supabase
        .from('rundowns')
        .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state, tab_id, numbering_locked, locked_row_numbers')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.error('❌ Catch-up sync fetch error:', error);
        return false;
      }

      if (data) {
        const serverDoc = data.doc_version || 0;
        const localDoc = state.lastProcessedDocVersion;
        const currentTabId = getTabId();
        const lastSavedByThisTab = data.tab_id === currentTabId;

        console.log(`📊 Catch-up sync: server doc_version=${serverDoc}, local=${localDoc}, last_saved_by_this_tab=${lastSavedByThisTab}`);

        if (serverDoc > localDoc || forceSync) {
          const missedUpdates = serverDoc - localDoc;
          
          // Update tracking state regardless
          state.lastProcessedDocVersion = serverDoc;
          state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);

          // Only call callbacks if there are ACTUAL missed updates
          if (missedUpdates > 0) {
            console.log(`✅ Catch-up sync: applying ${missedUpdates} missed update(s)`);
            
            state.callbacks.onRundownUpdate.forEach(cb => {
              try { cb(data); } catch (err) { console.error('Error in callback:', err); }
            });

            if (!isInitialLoadRef.current) {
              toast.info(`Synced ${missedUpdates} update${missedUpdates > 1 ? 's' : ''}`);
            }
            return true;
          } else {
            console.log('📊 Catch-up sync: forceSync verified - already in sync');
          }
          return false;
        } else {
          console.log('📊 Catch-up sync: already up to date');
        }
      }
    } finally {
      setTimeout(() => setIsProcessingUpdate(false), 500);
    }
    return false;
  }, [rundownId, hasPendingUpdates]);

  // Keep ref updated with latest function
  performCatchupSyncRef.current = performCatchupSync;

  // Lightweight version check - queries only doc_version column
  // Also verifies auth connectivity to catch token refresh failures early
  // Returns { success: true, needsSync: boolean } if check succeeded, or { success: false } if network error
  const checkServerVersion = useCallback(async (): Promise<{ success: boolean; needsSync: boolean }> => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return { success: false, needsSync: false };

    try {
      // First verify auth session is still valid - catches network drops and token refresh failures
      const { data: { session }, error: authError } = await supabase.auth.getSession();
      
      if (authError || !session) {
        console.warn('⚠️ Health check: auth session invalid or network error');
        return { success: false, needsSync: false };
      }

      const { data, error } = await supabase
        .from('rundowns')
        .select('doc_version')
        .eq('id', rundownId)
        .single();

      if (error) {
        console.warn('⚠️ Version check failed:', error.message);
        return { success: false, needsSync: false };
      }

      const serverVersion = data?.doc_version || 0;
      const localVersion = state.lastProcessedDocVersion;
      
      if (serverVersion > localVersion) {
        console.log(`🔍 Version mismatch detected: server=${serverVersion}, local=${localVersion} (${serverVersion - localVersion} missed)`);
        return { success: true, needsSync: true };
      }
      
      // Versions match - connection is proven healthy
      return { success: true, needsSync: false };
    } catch (err) {
      console.warn('⚠️ Version check error:', err);
      return { success: false, needsSync: false };
    }
  }, [rundownId]);

  const checkServerVersionRef = useRef<() => Promise<{ success: boolean; needsSync: boolean }>>();
  checkServerVersionRef.current = checkServerVersion;

  // Initialize channel (called on mount and after nuclear reset)
  const initializeChannel = useCallback(async () => {
    if (!rundownId) return;

    // Guard: Don't reinitialize if channel already exists (connected or connecting)
    const existingState = globalSubscriptions.get(rundownId);
    if (existingState?.subscription) {
      console.log('📡 Consolidated channel already exists (connected:', existingState.isConnected, ') - skipping reinitialization');
      return;
    }

    console.log('📡 Initializing consolidated channel:', rundownId);

    // Calculate new generation for this channel
    const newGeneration = (globalSubscriptions.get(rundownId)?.generation || 0) + 1;

    const channel = supabase
      .channel(`consolidated-realtime-${rundownId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'rundowns'
      }, (payload) => {
        const state = globalSubscriptions.get(rundownId);
        if (state) processRealtimeUpdate(payload, state);
      });

    if (!isSharedView) {
      channel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blueprints'
      }, (payload) => {
        const state = globalSubscriptions.get(rundownId);
        if (state) processRealtimeUpdate({ ...payload, table: 'blueprints' }, state);
      });
    }

    // Create or update state
    let globalState = globalSubscriptions.get(rundownId);
    if (!globalState) {
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
        generation: newGeneration
      };
      globalSubscriptions.set(rundownId, globalState);
    } else {
      globalState.subscription = channel;
      globalState.generation = newGeneration;
    }

    // Capture generation at subscribe time for stale callback detection
    const subscribedGeneration = newGeneration;

    channel.subscribe(async (status) => {
      const state = globalSubscriptions.get(rundownId);
      
      // Check BOTH reference AND generation to ignore stale callbacks
      if (!state || state.subscription !== channel) {
        console.log('📡 Consolidated: ignoring stale callback (channel reference mismatch)');
        return;
      }
      if (state.generation !== subscribedGeneration) {
        console.log('📡 Consolidated: ignoring stale callback (generation mismatch:', subscribedGeneration, 'vs', state.generation, ')');
        return;
      }

      state.isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setConsolidatedConnected(rundownId, state.isConnected);
      setIsConnected(state.isConnected);

      if (status === 'SUBSCRIBED') {
        console.log('✅ Consolidated channel connected:', rundownId);
        realtimeReset.resetAttemptCount();

        // Initial fetch
        try {
          const { data, error } = await supabase
            .from('rundowns')
            .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
            .eq('id', rundownId)
            .single();

          if (!error && data) {
            const serverDoc = data.doc_version || 0;
            if (serverDoc > state.lastProcessedDocVersion) {
              state.lastProcessedDocVersion = serverDoc;
              state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
              state.callbacks.onRundownUpdate.forEach(cb => {
                try { cb(data); } catch (err) { console.error('Callback error:', err); }
              });
            }

            setIsInitialLoad(false);
            isInitialLoadRef.current = false;
          }
        } catch (err) {
          console.error('Initial fetch error:', err);
          setTimeout(() => {
            setIsInitialLoad(false);
            isInitialLoadRef.current = false;
          }, 2000);
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        console.warn('📡 Consolidated channel issue:', status);
        // No retry - nuclear reset will handle recovery on visibility change
      }
    });
  }, [rundownId, isSharedView, lastSeenDocVersion]);

  // Process realtime updates
  const processRealtimeUpdate = useCallback((payload: any, globalState: any) => {
    const updateTimestamp = payload.new?.updated_at;
    const normalizedTimestamp = normalizeTimestamp(updateTimestamp);
    const incomingDocVersion = payload.new?.doc_version || 0;

    if (payload.new?.id !== rundownId && payload.new?.rundown_id !== rundownId) {
      return;
    }

    // Skip stale or duplicate updates
    if (incomingDocVersion && incomingDocVersion <= globalState.lastProcessedDocVersion) {
      return;
    }

    if (normalizedTimestamp && normalizedTimestamp === globalState.lastProcessedTimestamp) {
      return;
    }

    // Skip own updates - but still track the version to prevent false "missed updates" in catch-up sync
    if (payload.new?.tab_id === getTabId()) {
      if (incomingDocVersion && incomingDocVersion > globalState.lastProcessedDocVersion) {
        globalState.lastProcessedDocVersion = incomingDocVersion;
        globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
        lastUpdateTimeRef.current = Date.now();
      }
      return;
    }

    // Determine update type
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== JSON.stringify(payload.old?.showcaller_state);
    const hasBlueprintChanges = payload.table === 'blueprints';

    // Update tracking state
    globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
    if (incomingDocVersion) {
      globalState.lastProcessedDocVersion = incomingDocVersion;
    }
    lastUpdateTimeRef.current = Date.now();

    // Dispatch to callbacks
    if (hasBlueprintChanges) {
      globalState.callbacks.onBlueprintUpdate.forEach((cb: (d: any) => void) => {
        try { cb(payload.new); } catch (err) { console.error('Blueprint callback error:', err); }
      });
    } else if (hasShowcallerChanges && !hasContentChanges) {
      globalState.callbacks.onShowcallerUpdate.forEach((cb: (d: any) => void) => {
        try { cb(payload.new); } catch (err) { console.error('Showcaller callback error:', err); }
      });
    } else if (hasContentChanges) {
      // Use cell broadcasts for content - only fall back to database if unhealthy
      import('@/utils/cellBroadcast').then(({ cellBroadcast }) => {
        if (!cellBroadcast.isBroadcastHealthy(rundownId || '')) {
          globalState.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
            try { cb(payload.new); } catch (err) { console.error('Rundown callback error:', err); }
          });
        }
      });
    }
  }, [rundownId, user?.id, isSharedView]);

  // Callback refs
  const callbackRefs = useRef({ onRundownUpdate, onShowcallerUpdate, onBlueprintUpdate });
  callbackRefs.current = { onRundownUpdate, onShowcallerUpdate, onBlueprintUpdate };

  // Network event handlers
  useEffect(() => {
    if (!enabled || !rundownId) {
      setIsConnected(false);
      return;
    }

    const handleOnline = async () => {
      if (realtimeReset.isResetInProgress()) {
        console.log('📶 Network online but reset in progress - skipping');
        return;
      }
      
      console.log('📶 Network online - performing nuclear reset');
      simpleConnectionHealth.cleanup(rundownId);
      
      const success = await realtimeReset.performNuclearReset();
      if (success) {
        // Reset catch-up throttle to allow immediate sync after nuclear reset
        lastCatchupAttemptRef.current = 0;
        
        // Preserve existing callbacks before deleting stale subscription
        const existingState = globalSubscriptions.get(rundownId);
        const preservedCallbacks = existingState ? {
          onRundownUpdate: new Set(existingState.callbacks.onRundownUpdate),
          onShowcallerUpdate: new Set(existingState.callbacks.onShowcallerUpdate),
          onBlueprintUpdate: new Set(existingState.callbacks.onBlueprintUpdate)
        } : null;
        
        globalSubscriptions.delete(rundownId);
        await initializeChannel();
        
        // Re-register preserved callbacks on new state
        if (preservedCallbacks) {
          const newState = globalSubscriptions.get(rundownId);
          if (newState) {
            preservedCallbacks.onRundownUpdate.forEach(cb => newState.callbacks.onRundownUpdate.add(cb));
            preservedCallbacks.onShowcallerUpdate.forEach(cb => newState.callbacks.onShowcallerUpdate.add(cb));
            preservedCallbacks.onBlueprintUpdate.forEach(cb => newState.callbacks.onBlueprintUpdate.add(cb));
          }
        }
        // Re-initialize other channels
        const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
        const { cellBroadcast } = await import('@/utils/cellBroadcast');
        showcallerBroadcast.reinitialize(rundownId);
        cellBroadcast.reinitialize(rundownId);
        
        setTimeout(async () => {
          // Force sync after nuclear reset - we may have missed updates while offline
          await performCatchupSync(true);
        }, 2000);
      }
    };

    const handleOffline = () => {
      console.log('📵 Network offline');
      setIsConnected(false);
      const state = globalSubscriptions.get(rundownId);
      if (state) {
        state.isConnected = false;
        simpleConnectionHealth.setConsolidatedConnected(rundownId, false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [enabled, rundownId, performCatchupSync]); // Removed initializeChannel from deps

  // Visibility change handler - THE NUCLEAR RESET TRIGGER
  useEffect(() => {
    if (!enabled || !rundownId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') {
        // Tab going hidden - record timestamp
        realtimeReset.updateVisibleTimestamp();
        return;
      }

      // Skip if reset already in progress
      if (realtimeReset.isResetInProgress()) {
        console.log('👁️ Tab visible but reset in progress - skipping');
        return;
      }

      // Tab becoming visible
      console.log('👁️ Tab visible - checking if nuclear reset needed...');

      // Check if this was an extended sleep
      if (realtimeReset.wasExtendedSleep()) {
        // Check if channels are actually healthy before nuking them
        const health = simpleConnectionHealth.getHealth(rundownId);
        
        // Context-aware health check - some views (teleprompter) don't use showcaller channel
        const isHealthy = skipShowcallerInHealthCheck 
          ? (health.consolidated && health.cell)  // Only check channels this view uses
          : health.allConnected;                   // Check all channels
        
        if (isHealthy) {
          // Channels survived the extended absence - force sync to catch missed updates
          console.log('👁️ Extended absence but channels healthy - force catching up');
          await performCatchupSync(true);
        } else {
          // Channels are degraded - perform nuclear reset
          console.log(`☢️ Extended sleep + degraded connections - performing nuclear reset (consolidated: ${health.consolidated}, showcaller: ${health.showcaller}, cell: ${health.cell})`);
          
          // Clear stale health state before reinitializing
          simpleConnectionHealth.cleanup(rundownId);
          
          // Reset catch-up throttle
          lastCatchupAttemptRef.current = 0;
          
          const success = await realtimeReset.performNuclearReset();
          if (success) {
            // Preserve existing callbacks before deleting stale subscription
            const existingState = globalSubscriptions.get(rundownId);
            const preservedCallbacks = existingState ? {
              onRundownUpdate: new Set(existingState.callbacks.onRundownUpdate),
              onShowcallerUpdate: new Set(existingState.callbacks.onShowcallerUpdate),
              onBlueprintUpdate: new Set(existingState.callbacks.onBlueprintUpdate)
            } : null;
            
            globalSubscriptions.delete(rundownId);
            
            // Re-initialize ALL channels
            await initializeChannel();
            
            // Re-register preserved callbacks on new state
            if (preservedCallbacks) {
              const newState = globalSubscriptions.get(rundownId);
              if (newState) {
                preservedCallbacks.onRundownUpdate.forEach(cb => newState.callbacks.onRundownUpdate.add(cb));
                preservedCallbacks.onShowcallerUpdate.forEach(cb => newState.callbacks.onShowcallerUpdate.add(cb));
                preservedCallbacks.onBlueprintUpdate.forEach(cb => newState.callbacks.onBlueprintUpdate.add(cb));
              }
            }
            const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
            const { cellBroadcast } = await import('@/utils/cellBroadcast');
            showcallerBroadcast.reinitialize(rundownId);
            cellBroadcast.reinitialize(rundownId);
            
            // Give channels a moment to connect, then force catch up and verify health
            setTimeout(async () => {
              const health = simpleConnectionHealth.getHealth(rundownId);
              console.log('✅ Nuclear reset complete - health:', health, '- force syncing data');
              
              // Force notify to clear any stale UI state
              simpleConnectionHealth.forceNotify(rundownId);
              
              await performCatchupSync(true);
              
              // Secondary health verification 3 seconds later
              setTimeout(() => {
                const secondaryHealth = simpleConnectionHealth.getHealth(rundownId);
                if (secondaryHealth.anyDisconnected) {
                  console.warn('☢️ Post-reset health check failed - channels still disconnected, will retry on next visibility change');
                } else {
                  console.log('☢️ Post-reset health check passed - all channels stable');
                }
              }, 3000);
            }, 2000);
          }
        }
      } else {
        // Normal tab switch - just catch up
        console.log('👁️ Short absence - just catching up');
        await performCatchupSync();
      }

      realtimeReset.updateVisibleTimestamp();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, rundownId, performCatchupSync]); // Removed initializeChannel from deps

  // Polling fallback (3 minute stale threshold)
  useEffect(() => {
    if (!enabled || !rundownId) {
      console.log(`⏰ Health check: NOT starting (enabled=${enabled}, rundownId=${rundownId})`);
      return;
    }

    console.log(`⏰ Health check interval STARTED for ${rundownId} - first check in 3m`);

    const checkInterval = setInterval(async () => {
      // Skip if save is in progress
      if (simpleConnectionHealth.isSaveInProgress(rundownId)) {
        console.log('⏰ 3m health check: skipped (save in progress)');
        return;
      }
      
      // Skip if reset already in progress
      if (realtimeReset.isResetInProgress()) {
        console.log('⏰ 3m health check: skipped (reset in progress)');
        return;
      }
      
      const state = globalSubscriptions.get(rundownId);
      if (!state) {
        console.log('⏰ 3m health check: skipped (no subscription state)');
        return;
      }

      // PROACTIVE VERSION CHECK - detect desync within 3 minutes
      const versionCheckResult = await checkServerVersionRef.current?.();
      
      if (versionCheckResult?.success) {
        // Version check succeeded - connection is proven healthy, reset stale timer
        lastUpdateTimeRef.current = Date.now();
        
        if (versionCheckResult.needsSync) {
          console.log('⏰ 3m health check: version mismatch - triggering catch-up sync');
          await performCatchupSyncRef.current?.(true);
        } else {
          console.log('⏰ 3m health check: versions match, connection healthy');
        }
        return; // Skip stale check - connection is proven working
      }

      // Version check failed (network error) - fall back to stale threshold as safety net
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const STALE_THRESHOLD = 180000; // 3 minutes - secondary safety net for network errors
      const isStale = timeSinceLastUpdate > STALE_THRESHOLD;

      console.log(`⏰ 3m health check: version check failed, connected=${state.isConnected}, lastUpdate=${Math.round(timeSinceLastUpdate/1000)}s ago, stale=${isStale}`);

      if (!state.isConnected || isStale) {
        console.log('⏰ 3m health check: Connection stale or disconnected - performing nuclear reset');
        simpleConnectionHealth.cleanup(rundownId);
        
        const success = await realtimeReset.performNuclearReset();
        if (success) {
          // Preserve existing callbacks before deleting stale subscription
          const existingState = globalSubscriptions.get(rundownId);
          const preservedCallbacks = existingState ? {
            onRundownUpdate: new Set(existingState.callbacks.onRundownUpdate),
            onShowcallerUpdate: new Set(existingState.callbacks.onShowcallerUpdate),
            onBlueprintUpdate: new Set(existingState.callbacks.onBlueprintUpdate)
          } : null;
          
          globalSubscriptions.delete(rundownId);
          await initializeChannel();
          
          // Re-register preserved callbacks on new state
          if (preservedCallbacks) {
            const newState = globalSubscriptions.get(rundownId);
            if (newState) {
              preservedCallbacks.onRundownUpdate.forEach(cb => newState.callbacks.onRundownUpdate.add(cb));
              preservedCallbacks.onShowcallerUpdate.forEach(cb => newState.callbacks.onShowcallerUpdate.add(cb));
              preservedCallbacks.onBlueprintUpdate.forEach(cb => newState.callbacks.onBlueprintUpdate.add(cb));
            }
          }
          const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
          const { cellBroadcast } = await import('@/utils/cellBroadcast');
          showcallerBroadcast.reinitialize(rundownId);
          cellBroadcast.reinitialize(rundownId);
          
        setTimeout(async () => {
            await performCatchupSyncRef.current?.();
            lastUpdateTimeRef.current = Date.now();
          }, 2000);
        }
      }
    }, 180000); // Check every 3 minutes

    return () => {
      console.log(`⏰ Health check interval STOPPED for ${rundownId}`);
      clearInterval(checkInterval);
    };
  }, [enabled, rundownId]); // Removed performCatchupSync - using ref instead

  // Main subscription effect
  useEffect(() => {
    if (!rundownId || (!user && !isSharedView) || !enabled) return;
    if (user && !tokenReady) return;

    setIsInitialLoad(true);
    isInitialLoadRef.current = true;

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
      // Initialize channel for first time
      initializeChannel();
      globalState = globalSubscriptions.get(rundownId);
    }

    if (!globalState) return;

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

      if (state.refCount < 0) {
        state.refCount = 0;
      }

      // Keep channel alive across effect re-runs - only log for debugging
      // Channel will be reused on next mount, preventing duplicate initialization
      console.log('📡 Consolidated callback removed, channel kept alive for reuse (refCount:', state.refCount, ')');
    };
  }, [rundownId, user, tokenReady, enabled, isSharedView]); // Removed initializeChannel from deps

  // Stub functions for compatibility
  const setTypingChecker = useCallback((_checker: () => boolean) => {}, []);
  const setUnsavedChecker = useCallback((_checker: () => boolean) => {}, []);
  const trackOwnUpdate = useCallback((_updateId?: string) => {}, []);

  return {
    isConnected,
    isProcessingUpdate,
    isInitialLoad,
    performCatchupSync,
    setTypingChecker,
    setUnsavedChecker,
    trackOwnUpdate
  };
};
