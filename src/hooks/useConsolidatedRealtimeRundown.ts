import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';

interface UseConsolidatedRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  trackOwnUpdate?: (timestamp: string) => void;
  lastSeenDocVersion?: number;
  isSharedView?: boolean;
}

// Single global subscription per rundown to prevent conflicts
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
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  trackOwnUpdate,
  lastSeenDocVersion = 0,
  isSharedView = false
}: UseConsolidatedRealtimeRundownProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);
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

  // Process realtime update with conflict prevention and gap handling
  const processRealtimeUpdate = useCallback((payload: any, globalState: any) => {
    const updateTimestamp = payload.new?.updated_at;
    const normalizedTimestamp = normalizeTimestamp(updateTimestamp);
    const incomingDocVersion = payload.new?.doc_version || 0;

    console.log('🔄 Consolidated realtime received:', {
      table: payload.table || 'rundowns',
      rundownId: payload.new?.id || payload.new?.rundown_id,
      targetRundownId: rundownId,
      lastUpdatedBy: payload.new?.last_updated_by,
      currentUserId: user?.id,
      docVersion: incomingDocVersion,
      timestamp: normalizedTimestamp
    });

    // Skip if not for current rundown 
    if (payload.new?.id !== rundownId && payload.new?.rundown_id !== rundownId) {
      console.log('❌ Skipping - wrong rundown ID');
      return;
    }

    // Primary guard: doc_version (monotonic). If stale, skip early
    if (incomingDocVersion && incomingDocVersion <= globalState.lastProcessedDocVersion) {
      console.log('❌ Skipping stale doc version:', {
        incoming: incomingDocVersion,
        lastProcessed: globalState.lastProcessedDocVersion
      });
      return;
    }

    // Timestamp dedup as secondary guard
    if (normalizedTimestamp && normalizedTimestamp === globalState.lastProcessedTimestamp) {
      console.log('❌ Skipping duplicate timestamp:', normalizedTimestamp);
      return;
    }

    // Skip own updates by user id (authoritative) or timestamp (best-effort)
    const isOwnUpdate = payload.new?.last_updated_by === user?.id ||
                        (normalizedTimestamp && globalState.ownUpdates.has(normalizedTimestamp));
    if (isOwnUpdate) {
      console.log('❌ Skipping own update:', { 
        reason: payload.new?.last_updated_by === user?.id ? 'user_id_match' : 'timestamp_tracked',
        normalizedTimestamp, 
        incomingDocVersion 
      });
      globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
      if (incomingDocVersion) {
        globalState.lastProcessedDocVersion = incomingDocVersion;
      }
      return;
    }

    // Detect missed updates (doc_version gap) and perform catch-up read
    if (incomingDocVersion && incomingDocVersion > (globalState.lastProcessedDocVersion + 1)) {
      console.warn('⚠️ Realtime gap detected, performing catch-up sync', {
        incomingDocVersion,
        lastProcessed: globalState.lastProcessedDocVersion
      });
      setIsProcessingUpdate(true);
      (async () => {
        const { data, error } = await supabase
          .from('rundowns')
          .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
          .eq('id', rundownId as string)
          .single();
        setIsProcessingUpdate(false);
        if (!error && data) {
          globalState.lastProcessedTimestamp = normalizeTimestamp(data.updated_at);
          if (data.doc_version) {
            globalState.lastProcessedDocVersion = data.doc_version;
          }
          // Dispatch as content update (we fetched whole row)
          globalState.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
            try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
          });
        } else {
          console.error('Catch-up sync failed:', error);
        }
      })();
      return;
    }

    // Determine update type
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== JSON.stringify(payload.old?.showcaller_state);
    const hasBlueprintChanges = payload.table === 'blueprints';

    console.log('✅ Processing consolidated realtime update:', {
      type: hasBlueprintChanges ? 'blueprint' : hasShowcallerChanges && !hasContentChanges ? 'showcaller' : 'content',
      docVersion: incomingDocVersion,
      timestamp: normalizedTimestamp,
      hasContentChanges,
      hasShowcallerChanges,
      hasBlueprintChanges,
      callbackCounts: {
        rundown: globalState.callbacks.onRundownUpdate.size,
        showcaller: globalState.callbacks.onShowcallerUpdate.size,
        blueprint: globalState.callbacks.onBlueprintUpdate.size
      }
    });

    // Update tracking
    globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
    if (incomingDocVersion) {
      globalState.lastProcessedDocVersion = incomingDocVersion;
    }

    // Dispatch to appropriate callbacks
    if (hasBlueprintChanges) {
      console.log('📧 Dispatching to blueprint callbacks:', globalState.callbacks.onBlueprintUpdate.size);
      globalState.callbacks.onBlueprintUpdate.forEach((callback: (d: any) => void) => {
        try { callback(payload.new); } catch (error) { console.error('Error in blueprint callback:', error); }
      });
    } else if (hasShowcallerChanges && !hasContentChanges) {
      console.log('📧 Dispatching to showcaller callbacks:', globalState.callbacks.onShowcallerUpdate.size);
      globalState.callbacks.onShowcallerUpdate.forEach((callback: (d: any) => void) => {
        try { callback(payload.new); } catch (error) { console.error('Error in showcaller callback:', error); }
      });
    } else if (hasContentChanges) {
      console.log('📧 Dispatching to rundown callbacks:', globalState.callbacks.onRundownUpdate.size);
      setIsProcessingUpdate(true);
      try {
        globalState.callbacks.onRundownUpdate.forEach((callback: (d: any) => void) => {
          try { callback(payload.new); } catch (error) { console.error('Error in rundown callback:', error); }
        });
      } finally {
        setIsProcessingUpdate(false);
      }
    }

  }, [rundownId, user?.id]);

  useEffect(() => {
    if (!rundownId || !user || !enabled) {
      return;
    }

    let globalState = globalSubscriptions.get(rundownId);

    if (!globalState) {
      // Create new global subscription
      console.log('📡 Creating consolidated realtime subscription for', rundownId);
      
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
            setIsProcessingUpdate(true);
            const { data, error } = await supabase
              .from('rundowns')
              .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
              .eq('id', rundownId as string)
              .single();
            if (!error && data) {
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
            setIsProcessingUpdate(false);
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
        refCount: 0
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
        supabase.removeChannel(state.subscription);
        globalSubscriptions.delete(rundownId);
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

  // Provide own update tracking function
  const trackOwnUpdateFunc = useCallback((timestamp: string) => {
    const state = globalSubscriptions.get(rundownId || '');
    if (state) {
      const normalizedTimestamp = normalizeTimestamp(timestamp);
      state.ownUpdates.add(normalizedTimestamp);
      
      // Clean up after 20 seconds
      setTimeout(() => {
        state.ownUpdates.delete(normalizedTimestamp);
      }, 20000);
    }
  }, [rundownId]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateFunc,
    // Legacy compatibility methods (no-ops maintained)
    setTypingChecker: (checker: any) => {},
    setUnsavedChecker: (checker: any) => {},
    performCatchupSync: async () => {
      const state = globalSubscriptions.get(rundownId || '');
      if (!rundownId || !state) return;
      try {
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
        setIsProcessingUpdate(false);
      }
    }
  };
};
