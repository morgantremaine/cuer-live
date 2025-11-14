import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import { debugLogger } from '@/utils/debugLogger';
import { ownUpdateTracker } from '@/services/OwnUpdateTracker';

interface UseConsolidatedRealtimeRundownProps {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  isSharedView?: boolean;
}

// Simplified global subscription state - ReliabilityManager handles version checking
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
  isSharedView = false
}: UseConsolidatedRealtimeRundownProps) => {
  const { user, tokenReady } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Track actual channel connection status from globalSubscriptions
  useEffect(() => {
    if (!enabled || !rundownId) {
      setIsConnected(false);
      return;
    }

    const checkInterval = setInterval(() => {
      const state = globalSubscriptions.get(rundownId);
      setIsConnected(state?.isConnected || false);
    }, 1000);

    return () => clearInterval(checkInterval);
  }, [enabled, rundownId]);

  // Subscribe or unsubscribe based on enabled state and auth token readiness
  useEffect(() => {
    const unsubscribe = () => {
      if (!rundownId) return;

      const state = globalSubscriptions.get(rundownId);
      if (!state) return;

      // Remove our callbacks
      if (onRundownUpdate) state.callbacks.onRundownUpdate.delete(onRundownUpdate);
      if (onShowcallerUpdate) state.callbacks.onShowcallerUpdate.delete(onShowcallerUpdate);
      if (onBlueprintUpdate) state.callbacks.onBlueprintUpdate.delete(onBlueprintUpdate);

      state.refCount--;

      // Clean up if no more subscribers
      if (state.refCount <= 0 && state.subscription) {
        console.log(`🔌 No more subscribers - cleaning up consolidated channel for ${rundownId}`);
        supabase.removeChannel(state.subscription);
        globalSubscriptions.delete(rundownId);
      }
    };
    
    if (!enabled || !rundownId || !tokenReady) {
      unsubscribe();
      return;
    }

    let state = globalSubscriptions.get(rundownId);
    
    if (!state) {
      // Create new global state for this rundown
      state = {
        subscription: null,
        callbacks: {
          onRundownUpdate: new Set(),
          onShowcallerUpdate: new Set(),
          onBlueprintUpdate: new Set()
        },
        isConnected: false,
        refCount: 0
      };
      globalSubscriptions.set(rundownId, state);
    }

    // Add callbacks
    if (onRundownUpdate) state.callbacks.onRundownUpdate.add(onRundownUpdate);
    if (onShowcallerUpdate) state.callbacks.onShowcallerUpdate.add(onShowcallerUpdate);
    if (onBlueprintUpdate) state.callbacks.onBlueprintUpdate.add(onBlueprintUpdate);

    state.refCount++;

    // Create subscription if it doesn't exist
    if (!state.subscription) {
      console.log(`📡 Creating consolidated channel for ${rundownId}`);

      const subscription = supabase
        .channel(`rundown-changes-${rundownId}`)
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        }, (payload: any) => {
          debugLogger.realtime('📨 Consolidated rundown update received');

          const updateData = payload.new;
          const updateDocVersion = updateData.doc_version || 0;

          // Only filter own updates - ReliabilityManager handles version conflicts
          if (ownUpdateTracker.isOwnUpdate(updateData.id, updateDocVersion)) {
            debugLogger.realtime('⏭️ Skipping own update');
            return;
          }

          debugLogger.realtime('✅ Processing rundown update');

          // Notify all rundown subscribers
          state.callbacks.onRundownUpdate.forEach((cb: (d: any) => void) => {
            try {
              cb(updateData);
            } catch (err) {
              console.error('Error in rundown callback:', err);
            }
          });
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'showcaller_state',
          filter: `rundown_id=eq.${rundownId}`
        }, (payload: any) => {
          debugLogger.realtime('📨 Showcaller update received');

          // Notify all showcaller subscribers
          state.callbacks.onShowcallerUpdate.forEach((cb: (d: any) => void) => {
            try {
              cb(payload.new);
            } catch (err) {
              console.error('Error in showcaller callback:', err);
            }
          });
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'blueprint_state',
          filter: `rundown_id=eq.${rundownId}`
        }, (payload: any) => {
          debugLogger.realtime('📨 Blueprint update received');

          // Notify all blueprint subscribers
          state.callbacks.onBlueprintUpdate.forEach((cb: (d: any) => void) => {
            try {
              cb(payload.new);
            } catch (err) {
              console.error('Error in blueprint callback:', err);
            }
          });
        })
        .subscribe(async (status: string) => {
          debugLogger.realtime('🔄 Consolidated channel status:', status);
          
          if (status === 'SUBSCRIBED') {
            state.isConnected = true;
            setIsConnected(true);
            console.log(`✅ Consolidated channel subscribed for ${rundownId}`);
          } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            debugLogger.realtime('🔴 Consolidated channel error:', status, 'for', rundownId);
            state.isConnected = false;
            setIsConnected(false);
          }
        });

      state.subscription = subscription;
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, rundownId, user, tokenReady, onRundownUpdate, onShowcallerUpdate, onBlueprintUpdate, isSharedView]);

  return { 
    isConnected,
    // Stub methods for backward compatibility
    setTypingChecker: () => {},
    setUnsavedChecker: () => {},
    performCatchupSync: async () => false,
    trackOwnUpdate: () => {},
    isProcessingUpdate: false
  };
};
