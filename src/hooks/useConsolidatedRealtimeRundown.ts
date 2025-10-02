import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';

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
  gapDetectionInProgress: boolean;
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

    // SIMPLIFIED: No queuing - just apply updates immediately (Google Sheets style)
    // If the user is typing, the UI layer will handle conflicts with proper field focus protection

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
              
              // SIMPLIFIED: Apply gap resolution immediately - no queuing
              // The UI layer handles field-level protection during active typing
              
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
               // SIMPLIFIED: Apply initial catch-up immediately
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
