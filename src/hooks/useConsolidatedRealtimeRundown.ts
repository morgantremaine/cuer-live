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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  // Generate a unique tab identifier for own-update detection
  const tabIdRef = useRef(crypto.randomUUID());
  
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

  // Process realtime update with enhanced conflict prevention and proper doc version tracking
  const processRealtimeUpdate = useCallback((payload: any, globalState: any) => {
    const updateTimestamp = payload.new?.updated_at;
    const normalizedTimestamp = normalizeTimestamp(updateTimestamp);
    const incomingDocVersion = payload.new?.doc_version || 0;

    // Skip if not for current rundown 
    if (payload.new?.id !== rundownId && payload.new?.rundown_id !== rundownId) {
      return;
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

  // Own update detection: skip only updates originated by this specific tab (using tab ID stored in payload)
  if (!isSharedView) {
    // Check if this update came from this specific tab
    const updateTabId = payload.new?.tab_id || payload.new?.client_id;
    const isOwnTabUpdate = updateTabId && updateTabId === tabIdRef.current;
    
    if (isOwnTabUpdate) {
      debugLogger.realtime('Skipping own tab update:', { 
        normalizedTimestamp, 
        incomingDocVersion,
        tabId: updateTabId
      });
      globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
      if (incomingDocVersion) {
        globalState.lastProcessedDocVersion = incomingDocVersion;
      }
      return;
    }
    
    // Also check timestamp-based fallback for compatibility
    const isOwnTimestampUpdate = normalizedTimestamp && globalState.ownUpdates.has(normalizedTimestamp);
    if (isOwnTimestampUpdate) {
      debugLogger.realtime('Skipping own timestamp update:', { 
        normalizedTimestamp, 
        incomingDocVersion
      });
      globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
      if (incomingDocVersion) {
        globalState.lastProcessedDocVersion = incomingDocVersion;
      }
      return;
    }
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
      if (!isInitialLoad) {
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

    // Update tracking state
    globalState.lastProcessedTimestamp = normalizedTimestamp || globalState.lastProcessedTimestamp;
    if (incomingDocVersion) {
      globalState.lastProcessedDocVersion = incomingDocVersion;
    }

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
      // Show processing indicator for ALL content changes from remote sources (not during initial load)
      if (!isInitialLoad) {
        console.log('🔵 Blue Wi-Fi: Triggering indicator for remote content change', {
          docVersion: incomingDocVersion,
          timestamp: normalizedTimestamp,
          hasContentChanges: true
        });
        setIsProcessingUpdate(true);
        
        // Keep indicator visible for clear visibility
        setTimeout(() => {
          console.log('🔵 Blue Wi-Fi: Hiding indicator after timeout');
          setIsProcessingUpdate(false);
        }, 1500); // Extended to 1.5s for better visibility
      } else {
        console.log('🔵 Blue Wi-Fi: Skipping indicator - initial load in progress');
      }
      
      try {
        globalState.callbacks.onRundownUpdate.forEach((callback: (d: any) => void) => {
          try { 
            callback(payload.new); 
          } catch (error) { 
            console.error('Error in rundown callback:', error);
          }
        });
      } catch (error) {
        console.error('Error processing rundown update:', error);
      }
    }

  }, [rundownId, user?.id, isSharedView]);

  useEffect(() => {
    // For shared views, allow subscription without authentication
    if (!rundownId || (!user && !isSharedView) || !enabled) {
      return;
    }

    // Reset initial load flag for new rundown
    setIsInitialLoad(true);

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

  // Provide own update tracking function with tab ID
  const trackOwnUpdateFunc = useCallback((timestamp: string, includeTabId = true) => {
    const state = globalSubscriptions.get(rundownId || '');
    if (state) {
      const normalizedTimestamp = normalizeTimestamp(timestamp);
      state.ownUpdates.add(normalizedTimestamp);
      
      // Store our tab ID for future update filtering
      if (includeTabId) {
        state.ownUpdates.add(`tab:${tabIdRef.current}`);
      }
      
      // Clean up after 20 seconds
      setTimeout(() => {
        state.ownUpdates.delete(normalizedTimestamp);
        if (includeTabId) {
          state.ownUpdates.delete(`tab:${tabIdRef.current}`);
        }
      }, 20000);
    }
  }, [rundownId]);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate: trackOwnUpdateFunc,
    tabId: tabIdRef.current, // Expose tab ID for save operations
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
