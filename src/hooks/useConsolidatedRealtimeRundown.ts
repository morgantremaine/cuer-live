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
  hasPendingUpdates
}: UseConsolidatedRealtimeRundownProps) => {
  const { user, tokenReady } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const isInitialLoadRef = useRef(true);
  const lastUpdateTimeRef = useRef<number>(Date.now());
  const lastCatchupAttemptRef = useRef<number>(0);
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
          console.log(`✅ Catch-up sync: applying ${missedUpdates} missed update(s)`);
          
          // Update tracking state BEFORE callbacks
          state.lastProcessedDocVersion = serverDoc;
          state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);

          // ALWAYS apply server data during catch-up sync
          // The tab_id check is for realtime updates (echo prevention), not catch-up
          // Even if this tab saved last, there may have been other saves we missed
          state.callbacks.onRundownUpdate.forEach(cb => {
            try { cb(data); } catch (err) { console.error('Error in callback:', err); }
          });

          if (missedUpdates > 0 && !isInitialLoadRef.current) {
            toast.info(`Synced ${missedUpdates} update${missedUpdates > 1 ? 's' : ''}`);
          }
          return true;
        } else {
          console.log('📊 Catch-up sync: already up to date');
        }
      }
    } finally {
      setTimeout(() => setIsProcessingUpdate(false), 500);
    }
    return false;
  }, [rundownId, hasPendingUpdates]);

  // Initialize channel (called on mount and after nuclear reset)
  const initializeChannel = useCallback(async () => {
    if (!rundownId) return;

    // Guard: Don't reinitialize if already connected
    const existingState = globalSubscriptions.get(rundownId);
    if (existingState?.isConnected && existingState?.subscription) {
      console.log('📡 Consolidated channel already connected, skipping reinitialization');
      return;
    }

    console.log('📡 Initializing consolidated channel:', rundownId);

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
        refCount: 0
      };
      globalSubscriptions.set(rundownId, globalState);
    } else {
      globalState.subscription = channel;
    }

    channel.subscribe(async (status) => {
      const state = globalSubscriptions.get(rundownId);
      if (!state || state.subscription !== channel) return;

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

    // Skip own updates
    if (payload.new?.tab_id === getTabId()) {
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
        
        await initializeChannel();
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
        
        if (health.allConnected) {
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
            // Re-initialize ALL channels
            await initializeChannel();
            const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
            const { cellBroadcast } = await import('@/utils/cellBroadcast');
            showcallerBroadcast.reinitialize(rundownId);
            cellBroadcast.reinitialize(rundownId);
            
            // Give channels a moment to connect, then force catch up and verify health
            setTimeout(() => {
              const health = simpleConnectionHealth.getHealth(rundownId);
              console.log('✅ Nuclear reset complete - health:', health, '- force syncing data');
              
              // Force notify to clear any stale UI state
              simpleConnectionHealth.forceNotify(rundownId);
              
              performCatchupSync(true);
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
    if (!enabled || !rundownId) return;

    const checkInterval = setInterval(async () => {
      // Skip if reset already in progress
      if (realtimeReset.isResetInProgress()) return;
      
      const state = globalSubscriptions.get(rundownId);
      if (!state) return;

      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const STALE_THRESHOLD = 180000; // 3 minutes

      if (!state.isConnected || timeSinceLastUpdate > STALE_THRESHOLD) {
        console.log('⏰ Connection stale or disconnected - performing nuclear reset');
        simpleConnectionHealth.cleanup(rundownId);
        
        const success = await realtimeReset.performNuclearReset();
        if (success) {
          await initializeChannel();
          const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
          const { cellBroadcast } = await import('@/utils/cellBroadcast');
          showcallerBroadcast.reinitialize(rundownId);
          cellBroadcast.reinitialize(rundownId);
          
          setTimeout(async () => {
            await performCatchupSync();
            lastUpdateTimeRef.current = Date.now();
          }, 2000);
        }
      }
    }, 60000); // Check every minute

    return () => clearInterval(checkInterval);
  }, [enabled, rundownId, performCatchupSync]); // Removed initializeChannel from deps

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

      const totalCallbacks =
        state.callbacks.onRundownUpdate.size +
        state.callbacks.onShowcallerUpdate.size +
        state.callbacks.onBlueprintUpdate.size;

      if (state.refCount <= 0 && totalCallbacks === 0) {
        simpleConnectionHealth.cleanup(rundownId);

        const subscription = state.subscription;
        globalSubscriptions.delete(rundownId);

        setTimeout(() => {
          try {
            supabase.removeChannel(subscription);
          } catch (e) {
            console.warn('Cleanup error:', e);
          }
        }, 100);
      }
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
