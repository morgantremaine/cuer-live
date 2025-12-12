import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';
import { simpleConnectionHealth } from '@/services/SimpleConnectionHealth';
import { authMonitor } from '@/services/AuthMonitor';
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
  // Simple retry state
  retryCount: number;
  retryTimeout?: NodeJS.Timeout;
  isCleaningUp?: boolean;
}>();

const MAX_RETRIES = 10;

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
  const performCatchupSync = useCallback(async (): Promise<boolean> => {
    const state = globalSubscriptions.get(rundownId || '');
    if (!rundownId || !state) return false;
    
    const now = Date.now();
    if (now - lastCatchupAttemptRef.current < MIN_CATCHUP_INTERVAL) {
      console.log('⏱️ Skipping catch-up sync - too soon');
      return false;
    }
    lastCatchupAttemptRef.current = now;
    
    // Block if pending updates
    if (hasPendingUpdates?.()) {
      debugLogger.realtime('⚠️ Blocking catch-up sync - pending updates');
      return false;
    }
    
    try {
      setIsProcessingUpdate(true);
      
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state, tab_id, numbering_locked, locked_row_numbers')
        .eq('id', rundownId)
        .single();
        
      if (!error && data) {
        const serverDoc = data.doc_version || 0;
        const currentTabId = getTabId();
        const isOwnUpdate = data.tab_id === currentTabId;
        
        if (serverDoc > state.lastProcessedDocVersion) {
          state.lastProcessedDocVersion = serverDoc;
          state.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
          
          if (!isOwnUpdate) {
            state.callbacks.onRundownUpdate.forEach(cb => {
              try { cb(data); } catch (err) { console.error('Error in callback:', err); }
            });
          }
          
          const missedUpdates = isOwnUpdate ? 0 : Math.max(0, serverDoc - state.lastProcessedDocVersion);
          if (missedUpdates > 0 && !isInitialLoadRef.current) {
            toast.info(`Synced ${missedUpdates} update${missedUpdates > 1 ? 's' : ''}`);
          }
          return true;
        }
      }
    } finally {
      setTimeout(() => setIsProcessingUpdate(false), 500);
    }
    return false;
  }, [rundownId, hasPendingUpdates]);

  // Simple retry scheduling
  const scheduleRetry = useCallback((rundownId: string) => {
    const state = globalSubscriptions.get(rundownId);
    if (!state) return;
    
    if (state.retryCount >= MAX_RETRIES) {
      console.error('🚨 Consolidated: Max retries reached');
      return;
    }

    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
    }

    const delay = Math.min(1000 * Math.pow(2, state.retryCount), 30000);
    state.retryCount++;

    console.log(`📡 Consolidated: Retry ${state.retryCount}/${MAX_RETRIES} in ${delay}ms`);

    state.retryTimeout = setTimeout(async () => {
      state.retryTimeout = undefined;
      await forceReconnect(rundownId);
    }, delay);
  }, []);

  // Force reconnect function
  const forceReconnect = useCallback(async (rundownId: string) => {
    const state = globalSubscriptions.get(rundownId);
    if (!state) return;

    const isSessionValid = await authMonitor.isSessionValid();
    if (!isSessionValid) {
      console.log('🔐 Consolidated: Skipping reconnect - session expired');
      return;
    }

    console.log('📡 🔄 Force reconnecting consolidated:', rundownId);

    // Mark as intentional reconnect to suppress cosmetic failure logging
    simpleConnectionHealth.markIntentionalReconnect(rundownId);

    state.isCleaningUp = true;

    if (state.retryTimeout) {
      clearTimeout(state.retryTimeout);
      state.retryTimeout = undefined;
    }

    // Remove existing channel
    if (state.subscription) {
      try {
        await supabase.removeChannel(state.subscription);
      } catch (e) {
        console.warn('📡 Error removing channel:', e);
      }
    }

    // Safety net: reset isCleaningUp after 10s if new channel fails to connect
    setTimeout(() => {
      const s = globalSubscriptions.get(rundownId);
      if (s && s.isCleaningUp) {
        s.isCleaningUp = false;
        simpleConnectionHealth.clearIntentionalReconnect(rundownId);
      }
    }, 10000);

    // Create new channel
    const newChannel = supabase.channel(`consolidated-realtime-${rundownId}`);
    
    newChannel.on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'rundowns'
    }, (payload) => {
      const s = globalSubscriptions.get(rundownId);
      if (s) processRealtimeUpdate(payload, s);
    });

    if (!isSharedView) {
      newChannel.on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'blueprints'
      }, (payload) => {
        const s = globalSubscriptions.get(rundownId);
        if (s) processRealtimeUpdate({ ...payload, table: 'blueprints' }, s);
      });
    }

    // Set subscription BEFORE subscribing so callback can check channel identity
    state.subscription = newChannel;

    newChannel.subscribe(async (status) => {
      const s = globalSubscriptions.get(rundownId);
      if (!s) return;

      // Ignore callbacks from old channels - only process if this is the current subscription
      if (s.subscription !== newChannel) {
        console.log('📡 Ignoring callback from old channel');
        return;
      }

      const wasConnected = s.isConnected;
      s.isConnected = status === 'SUBSCRIBED';
      simpleConnectionHealth.setConsolidatedConnected(rundownId, s.isConnected);
      setIsConnected(s.isConnected);

      if (status === 'SUBSCRIBED') {
        // Reset isCleaningUp NOW - after new channel successfully connected
        s.isCleaningUp = false;
        // Clear intentional reconnect flag on success
        simpleConnectionHealth.clearIntentionalReconnect(rundownId);
        
        console.log('✅ Consolidated channel connected (reconnect):', rundownId);
        s.retryCount = 0;
        if (s.retryTimeout) {
          clearTimeout(s.retryTimeout);
          s.retryTimeout = undefined;
        }
        
        if (simpleConnectionHealth.areAllChannelsHealthy(rundownId)) {
          simpleConnectionHealth.resetFailures(rundownId);
        }

        // Catch-up on reconnection
        if (!wasConnected) {
          await performCatchupSync();
        }
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
        if (s.isCleaningUp) return;
        
        console.warn('📡 Consolidated channel issue:', status);
        scheduleRetry(rundownId);
      }
    });
  }, [isSharedView, performCatchupSync, scheduleRetry]);

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
      console.log('📶 Network online - reconnecting...');
      const state = globalSubscriptions.get(rundownId);
      if (state) {
        state.retryCount = 0; // Reset retries on network restore
      }
      await forceReconnect(rundownId);
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
  }, [enabled, rundownId, forceReconnect]);

  // Visibility change handler
  useEffect(() => {
    if (!enabled || !rundownId) return;

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible') return;
      
      const state = globalSubscriptions.get(rundownId);
      if (!state) return;
      
      console.log('👁️ Tab visible - checking ALL channel connections...');
      
      // Small delay to let browser/network stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      try {
        const { error } = await supabase
          .from('rundowns')
          .select('doc_version')
          .eq('id', rundownId)
          .single();
        
        // Import broadcast managers dynamically to avoid circular deps
        const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
        const { cellBroadcast } = await import('@/utils/cellBroadcast');
        
        if (error) {
          console.warn('❌ Connection dead on visibility - reconnecting ALL channels');
          await forceReconnect(rundownId);
          await showcallerBroadcast.forceReconnect(rundownId);
          await cellBroadcast.forceReconnect(rundownId);
        } else if (!state.isConnected) {
          console.log('📡 Consolidated not connected - reconnecting ALL channels');
          await forceReconnect(rundownId);
          await showcallerBroadcast.forceReconnect(rundownId);
          await cellBroadcast.forceReconnect(rundownId);
        } else {
          // Check individual channel health and reconnect if needed
          const showcallerHealthy = showcallerBroadcast.isChannelConnected(rundownId);
          const cellHealthy = cellBroadcast.isChannelConnected(rundownId);
          
          if (!showcallerHealthy) {
            console.log('📺 Showcaller unhealthy after visibility - reconnecting');
            await showcallerBroadcast.forceReconnect(rundownId);
          }
          if (!cellHealthy) {
            console.log('📱 Cell channel unhealthy after visibility - reconnecting');
            await cellBroadcast.forceReconnect(rundownId);
          }
          
          // Always do catch-up sync on visibility
          await performCatchupSync();
        }
      } catch (err) {
        console.warn('❌ Visibility check failed:', err);
        const { showcallerBroadcast } = await import('@/utils/showcallerBroadcast');
        const { cellBroadcast } = await import('@/utils/cellBroadcast');
        await forceReconnect(rundownId);
        await showcallerBroadcast.forceReconnect(rundownId);
        await cellBroadcast.forceReconnect(rundownId);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [enabled, rundownId, forceReconnect, performCatchupSync]);

  // Polling fallback (3 minute stale threshold)
  useEffect(() => {
    if (!enabled || !rundownId) return;
    
    const checkInterval = setInterval(async () => {
      const state = globalSubscriptions.get(rundownId);
      if (!state) return;
      
      const timeSinceLastUpdate = Date.now() - lastUpdateTimeRef.current;
      const STALE_THRESHOLD = 180000; // 3 minutes
      
      if (!state.isConnected) {
        await performCatchupSync();
        // Also force reconnect to fix potential zombie WebSocket
        console.log('🔄 Force reconnecting disconnected channel');
        await forceReconnect(rundownId);
      } else if (timeSinceLastUpdate > STALE_THRESHOLD) {
        console.log('⏰ No updates for 3+ minutes - checking for stale data');
        const hadUpdates = await performCatchupSync();
        // Force reconnect to eliminate potential zombie WebSocket
        console.log('🔄 Force reconnecting to prevent zombie WebSocket');
        await forceReconnect(rundownId);
        if (!hadUpdates) {
          lastUpdateTimeRef.current = Date.now();
        }
      }
    }, 30000);
    
    return () => clearInterval(checkInterval);
  }, [enabled, rundownId, performCatchupSync, forceReconnect]);

  // Main subscription effect
  useEffect(() => {
    if (!rundownId || (!user && !isSharedView) || !enabled) return;
    if (user && !tokenReady) return;

    setIsInitialLoad(true);
    isInitialLoadRef.current = true;

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
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

      // Create state object BEFORE subscribing so callback can check channel identity
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
        retryCount: 0
      };

      globalSubscriptions.set(rundownId, globalState);

      channel.subscribe(async (status) => {
        const state = globalSubscriptions.get(rundownId);
        if (!state) return;

        // Ignore callbacks from old channels - only process if this is the current subscription
        if (state.subscription !== channel) {
          console.log('📡 Ignoring callback from old channel (main subscription)');
          return;
        }

        state.isConnected = status === 'SUBSCRIBED';
        simpleConnectionHealth.setConsolidatedConnected(rundownId, state.isConnected);
        setIsConnected(state.isConnected);

        if (status === 'SUBSCRIBED') {
          console.log('✅ Consolidated channel connected:', rundownId);
          state.retryCount = 0;
          if (state.retryTimeout) {
            clearTimeout(state.retryTimeout);
            state.retryTimeout = undefined;
          }
          
          if (simpleConnectionHealth.areAllChannelsHealthy(rundownId)) {
            simpleConnectionHealth.resetFailures(rundownId);
          }

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
          if (state.isCleaningUp) return;
          
          console.warn('📡 Consolidated channel issue:', status);
          scheduleRetry(rundownId);
        }
      });
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
        state.isCleaningUp = true;
        
        if (state.retryTimeout) {
          clearTimeout(state.retryTimeout);
        }
        
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
  }, [rundownId, user, tokenReady, enabled, isSharedView, lastSeenDocVersion, processRealtimeUpdate, scheduleRetry]);

  // Stub functions for compatibility - these were part of the old complex system
  // but aren't needed with the simplified approach
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
