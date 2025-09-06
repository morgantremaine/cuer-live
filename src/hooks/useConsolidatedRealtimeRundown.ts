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

  // Process realtime update with conflict prevention
  const processRealtimeUpdate = useCallback((payload: any, globalState: any) => {
    const updateTimestamp = payload.new?.updated_at;
    const normalizedTimestamp = normalizeTimestamp(updateTimestamp);
    const incomingDocVersion = payload.new?.doc_version || 0;

    // Skip if not for current rundown
    if (payload.new?.id !== rundownId) {
      return;
    }

    // Deduplication: skip if we already processed this exact update
    if (normalizedTimestamp === globalState.lastProcessedTimestamp) {
      debugLogger.realtime('Skipping duplicate timestamp:', normalizedTimestamp);
      return;
    }

    // Doc version guard: skip stale updates
    if (incomingDocVersion && incomingDocVersion <= globalState.lastProcessedDocVersion) {
      debugLogger.realtime('Skipping stale doc version:', {
        incoming: incomingDocVersion,
        lastProcessed: globalState.lastProcessedDocVersion
      });
      return;
    }

    // Skip own updates
    const isOwnUpdate = globalState.ownUpdates.has(normalizedTimestamp) || 
                       payload.new?.last_updated_by === user?.id;
    
    if (isOwnUpdate) {
      debugLogger.realtime('Skipping own update:', normalizedTimestamp);
      globalState.lastProcessedTimestamp = normalizedTimestamp;
      if (incomingDocVersion) {
        globalState.lastProcessedDocVersion = incomingDocVersion;
      }
      return;
    }

    // Determine update type
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));
    
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== 
                                JSON.stringify(payload.old?.showcaller_state);

    const hasBlueprintChanges = payload.table === 'blueprints';

    console.log('📡 Consolidated realtime update:', {
      type: hasBlueprintChanges ? 'blueprint' : hasShowcallerChanges && !hasContentChanges ? 'showcaller' : 'content',
      docVersion: incomingDocVersion,
      timestamp: normalizedTimestamp
    });

    // Update tracking
    globalState.lastProcessedTimestamp = normalizedTimestamp;
    if (incomingDocVersion) {
      globalState.lastProcessedDocVersion = incomingDocVersion;
    }

    // Dispatch to appropriate callbacks
    if (hasBlueprintChanges) {
      globalState.callbacks.onBlueprintUpdate.forEach(callback => {
        try {
          callback(payload.new);
        } catch (error) {
          console.error('Error in blueprint callback:', error);
        }
      });
    } else if (hasShowcallerChanges && !hasContentChanges) {
      globalState.callbacks.onShowcallerUpdate.forEach(callback => {
        try {
          callback(payload.new);
        } catch (error) {
          console.error('Error in showcaller callback:', error);
        }
      });
    } else if (hasContentChanges) {
      globalState.callbacks.onRundownUpdate.forEach(callback => {
        try {
          callback(payload.new);
        } catch (error) {
          console.error('Error in rundown callback:', error);
        }
      });
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
            table: 'rundowns',
            filter: `id=eq.${rundownId}`
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
            table: 'blueprints',
            filter: `rundown_id=eq.${rundownId}`
          },
          (payload) => {
            const state = globalSubscriptions.get(rundownId);
            if (state) {
              processRealtimeUpdate({ ...payload, table: 'blueprints' }, state);
            }
          }
        );
      }

      channel.subscribe((status) => {
        const state = globalSubscriptions.get(rundownId);
        if (!state) return;

        if (status === 'SUBSCRIBED') {
          state.isConnected = true;
          console.log('✅ Consolidated realtime connected successfully');
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
  }, [rundownId, user?.id, enabled, processRealtimeUpdate, lastSeenDocVersion, isSharedView]);

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
    // Legacy compatibility methods (no-ops for now)
    setTypingChecker: (checker: any) => {},
    setUnsavedChecker: (checker: any) => {},
    performCatchupSync: async () => {}
  };
};
