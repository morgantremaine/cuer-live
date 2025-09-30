import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';
import { getTabId } from '@/utils/tabUtils';

interface UseConsolidatedRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  lastSeenDocVersion?: number; // Keep for compatibility but don't use
  isSharedView?: boolean;
  blockUntilLocalEditRef?: React.MutableRefObject<boolean>;
}

// Simplified global subscription state - only for showcaller/blueprint
const globalSubscriptions = new Map<string, {
  subscription: any;
  callbacks: {
    onRundownUpdate: Set<(data: any) => void>;
    onShowcallerUpdate: Set<(data: any) => void>;
    onBlueprintUpdate: Set<(data: any) => void>;
  };
  isConnected: boolean;
  refCount: number;
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  isSharedView = false,
}: UseConsolidatedRealtimeRundownProps) => {
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isProcessingUpdate, setIsProcessingUpdate] = useState(false);

  // Set connected immediately when rundown is enabled
  useEffect(() => {
    if (enabled && rundownId) {
      setIsConnected(true);
    } else {
      setIsConnected(false);
    }
  }, [enabled, rundownId]);
  
  // Callback refs
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

  // Simplified realtime update processing - ONLY for showcaller and blueprints
  const processRealtimeUpdate = useCallback(async (payload: any, globalState: any) => {
    // Skip if not for current rundown 
    if (payload.new?.id !== rundownId && payload.new?.rundown_id !== rundownId) {
      return;
    }

    // Skip updates from same tab
    if (payload.new?.tab_id === getTabId()) {
      console.log('⏭️ Skipping realtime update - own update (same tab)');
      return;
    }

    // Determine update type
    const hasShowcallerChanges = JSON.stringify(payload.new?.showcaller_state) !== JSON.stringify(payload.old?.showcaller_state);
    const hasBlueprintChanges = payload.table === 'blueprints';
    const hasContentChanges = ['items', 'title', 'start_time', 'timezone', 'external_notes', 'show_date']
      .some(field => JSON.stringify(payload.new?.[field]) !== JSON.stringify(payload.old?.[field]));

    console.log('📡 Realtime update:', {
      type: hasBlueprintChanges ? 'blueprint' : hasShowcallerChanges ? 'showcaller' : 'content',
      userId: payload.new?.last_updated_by
    });

    // Dispatch to appropriate callbacks
    if (hasBlueprintChanges) {
      globalState.callbacks.onBlueprintUpdate.forEach((callback: (d: any) => void) => {
        try { 
          callback(payload.new); 
        } catch (error) { 
          console.error('Error in blueprint callback:', error);
        }
      });
    } else if (hasShowcallerChanges && !hasContentChanges) {
      // ONLY showcaller changes (not content)
      globalState.callbacks.onShowcallerUpdate.forEach((callback: (d: any) => void) => {
        try { 
          callback(payload.new); 
        } catch (error) { 
          console.error('Error in showcaller callback:', error);
        }
      });
    } else if (hasContentChanges) {
      // Content changes are now handled by dedicated broadcast channels:
      // - Cell edits via cell broadcasts
      // - Structural changes via structural broadcasts
      // No database refresh needed - broadcasts provide instant sync
      console.log('📱 Content change detected - handled by broadcast channels');
    }
  }, [rundownId]);

  useEffect(() => {
    // For shared views, allow subscription without authentication
    if (!rundownId || (!user && !isSharedView) || !enabled) {
      return;
    }

    const existingSubscription = globalSubscriptions.get(rundownId);
    
    if (existingSubscription) {
      // Reuse existing subscription
      console.log('♻️ Reusing existing subscription for:', rundownId);
      existingSubscription.refCount++;
      
      // Register callbacks
      if (callbackRefs.current.onRundownUpdate) {
        existingSubscription.callbacks.onRundownUpdate.add(callbackRefs.current.onRundownUpdate);
      }
      if (callbackRefs.current.onShowcallerUpdate) {
        existingSubscription.callbacks.onShowcallerUpdate.add(callbackRefs.current.onShowcallerUpdate);
      }
      if (callbackRefs.current.onBlueprintUpdate) {
        existingSubscription.callbacks.onBlueprintUpdate.add(callbackRefs.current.onBlueprintUpdate);
      }
      
      // Update connection state
      setIsConnected(existingSubscription.isConnected);
      
      // Cleanup on unmount
      return () => {
        existingSubscription.refCount--;
        
        // Remove callbacks
        if (callbackRefs.current.onRundownUpdate) {
          existingSubscription.callbacks.onRundownUpdate.delete(callbackRefs.current.onRundownUpdate);
        }
        if (callbackRefs.current.onShowcallerUpdate) {
          existingSubscription.callbacks.onShowcallerUpdate.delete(callbackRefs.current.onShowcallerUpdate);
        }
        if (callbackRefs.current.onBlueprintUpdate) {
          existingSubscription.callbacks.onBlueprintUpdate.delete(callbackRefs.current.onBlueprintUpdate);
        }
        
        // If no more refs, clean up subscription
        if (existingSubscription.refCount <= 0) {
          console.log('🧹 Cleaning up subscription for:', rundownId);
          if (existingSubscription.subscription) {
            supabase.removeChannel(existingSubscription.subscription);
          }
          globalSubscriptions.delete(rundownId);
        }
      };
    }

    // Create new subscription
    console.log('📡 Creating realtime subscription for showcaller/blueprints:', rundownId);

    const state = {
      subscription: null as any,
      callbacks: {
        onRundownUpdate: new Set<(data: any) => void>(),
        onShowcallerUpdate: new Set<(data: any) => void>(),
        onBlueprintUpdate: new Set<(data: any) => void>()
      },
      isConnected: false,
      refCount: 1
    };

    // Register initial callbacks
    if (callbackRefs.current.onRundownUpdate) {
      state.callbacks.onRundownUpdate.add(callbackRefs.current.onRundownUpdate);
    }
    if (callbackRefs.current.onShowcallerUpdate) {
      state.callbacks.onShowcallerUpdate.add(callbackRefs.current.onShowcallerUpdate);
    }
    if (callbackRefs.current.onBlueprintUpdate) {
      state.callbacks.onBlueprintUpdate.add(callbackRefs.current.onBlueprintUpdate);
    }

    globalSubscriptions.set(rundownId, state);

    // Set up realtime subscription
    const channel = supabase
      .channel(`rundown-meta-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        (payload) => processRealtimeUpdate(payload, state)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'blueprints',
          filter: `rundown_id=eq.${rundownId}`
        },
        (payload) => processRealtimeUpdate(payload, state)
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          state.isConnected = true;
          setIsConnected(true);
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          state.isConnected = false;
          setIsConnected(false);
        }
      });

    state.subscription = channel;

    return () => {
      state.refCount--;
      
      // Remove callbacks
      if (callbackRefs.current.onRundownUpdate) {
        state.callbacks.onRundownUpdate.delete(callbackRefs.current.onRundownUpdate);
      }
      if (callbackRefs.current.onShowcallerUpdate) {
        state.callbacks.onShowcallerUpdate.delete(callbackRefs.current.onShowcallerUpdate);
      }
      if (callbackRefs.current.onBlueprintUpdate) {
        state.callbacks.onBlueprintUpdate.delete(callbackRefs.current.onBlueprintUpdate);
      }
      
      // Clean up if no more refs
      if (state.refCount <= 0) {
        console.log('🧹 Cleaning up realtime subscription');
        supabase.removeChannel(channel);
        globalSubscriptions.delete(rundownId);
      }
    };
  }, [rundownId, user, enabled, isSharedView, processRealtimeUpdate]);

  // Simplified API - no manual catch-up needed with operations
  const trackOwnUpdate = useCallback((updateId: string) => {
    debugLogger.realtime('Tracked own update:', updateId);
  }, []);

  const manualCatchUp = useCallback(async () => {
    console.log('⚠️ Manual catch-up no longer needed with operation-based sync');
  }, []);

  return {
    isConnected,
    isProcessingUpdate,
    trackOwnUpdate,
    manualCatchUp
  };
};
