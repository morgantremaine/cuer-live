import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cellBroadcast } from '@/utils/cellBroadcast';
import { useAuth } from './useAuth';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

interface ConsolidatedRealtimeOptions {
  rundownId: string | null;
  onRundownUpdate?: (data: any) => void;
  onShowcallerUpdate?: (data: any) => void;
  onBlueprintUpdate?: (data: any) => void;
  enabled?: boolean;
  isSharedView?: boolean;
  trackOwnUpdate?: (id: string, context?: string) => void;
  isOwnUpdate?: (payload: any) => boolean;
}

// Global subscription state
const globalSubscriptions = new Map<string, {
  subscription: any;
  onRundownUpdate: Set<(data: any) => void>;
  onShowcallerUpdate: Set<(data: any) => void>;
  onBlueprintUpdate: Set<(data: any) => void>;
  lastProcessedTimestamp: string | null;
  lastProcessedDocVersion: number;
  isConnected: boolean;
  refCount: number;
  itemDirtyQueue: any[];
}>();

export const useConsolidatedRealtimeRundown = ({
  rundownId,
  onRundownUpdate,
  onShowcallerUpdate,
  onBlueprintUpdate,
  enabled = true,
  isSharedView = false,
  trackOwnUpdate,
  isOwnUpdate
}: ConsolidatedRealtimeOptions) => {
  const { user } = useAuth();
  const isConnectedRef = useRef(false);
  const isProcessingUpdateRef = useRef(false);

  // Process realtime updates - SIMPLIFIED VERSION
  const processRealtimeUpdate = useCallback(async (payload: any, globalState: any) => {
    if (!payload?.new) return;

    const data = payload.new;
    const table = payload.table;
    const incomingTimestamp = normalizeTimestamp(data.updated_at);
    const incomingDocVersion = data.doc_version || 0;

    console.log('📡 Enhanced realtime update processing:', {
      table,
      timestamp: incomingTimestamp,
      docVersion: incomingDocVersion
    });

    // Check if this is our own update to prevent feedback loops
    if (isOwnUpdate && isOwnUpdate(payload)) {
      console.log('⏭️ Skipping realtime update - own update (same tab)');
      return;
    }

    // SIMPLIFIED: No LocalShadow protection - trust cell broadcasts
    
    // Update state immediately - no complex protection
    globalState.lastProcessedTimestamp = incomingTimestamp;
    globalState.lastProcessedDocVersion = incomingDocVersion;

    // Route updates based on table
    if (table === 'rundowns') {
      console.log('📱 Using cell broadcasts for content sync', { docVersion: incomingDocVersion });
      globalState.onRundownUpdate.forEach((cb: (d: any) => void) => {
        try { cb(data); } catch (err) { console.error('Error in rundown callback:', err); }
      });
    } else if (table === 'showcaller_sessions') {
      globalState.onShowcallerUpdate.forEach((cb: (d: any) => void) => {
        try { cb(data); } catch (err) { console.error('Error in showcaller callback:', err); }
      });
    } else if (table === 'blueprints') {
      globalState.onBlueprintUpdate.forEach((cb: (d: any) => void) => {
        try { cb(data); } catch (err) { console.error('Error in blueprint callback:', err); }
      });
    }

    globalState.isProcessingUpdate = false;
  }, [isOwnUpdate]);

  // Simplified catch-up sync - no complex gap detection
  const performCatchupSync = useCallback(async (globalState: any) => {
    if (!rundownId) return;

    try {
      const { data, error } = await supabase
        .from('rundowns')
        .select('id, items, title, start_time, timezone, external_notes, show_date, updated_at, doc_version, showcaller_state')
        .eq('id', rundownId as string)
        .single();
        
      if (!error && data) {
        // SIMPLIFIED: Apply initial sync immediately
        console.log('📺 Realtime activity: Starting indicator');
        console.log('✅ Gap resolved with server data:', {
          serverVersion: data.doc_version,
          targetVersion: data.doc_version
        });
        
        globalState.onRundownUpdate.forEach((cb: (d: any) => void) => {
          try { cb(data); } catch (err) { console.error('Error in catch-up callback:', err); }
        });
        
        console.log('📺 Realtime activity: Processing stopped');
      }
    } catch (error) {
      console.error('❌ Catch-up sync error:', error);
    }
  }, [rundownId]);

  useEffect(() => {
    // For shared views, allow subscription without authentication
    if (!rundownId || (!user && !isSharedView) || !enabled) {
      return;
    }

    // Get or create global subscription state
    let globalState = globalSubscriptions.get(rundownId);
    
    if (!globalState) {
      // Create new subscription
      console.log('🔌 Creating new consolidated realtime subscription for rundown:', rundownId);
      
      globalState = {
        subscription: null,
        onRundownUpdate: new Set(),
        onShowcallerUpdate: new Set(),
        onBlueprintUpdate: new Set(),
        lastProcessedTimestamp: null,
        lastProcessedDocVersion: 0,
        isConnected: false,
        refCount: 0,
        itemDirtyQueue: []
      };
      
      globalSubscriptions.set(rundownId, globalState);
    }

    // Add callbacks (fix structure)
    const callbacks = {
      onRundownUpdate: globalState.onRundownUpdate,
      onShowcallerUpdate: globalState.onShowcallerUpdate,
      onBlueprintUpdate: globalState.onBlueprintUpdate
    };

    if (onRundownUpdate) globalState.onRundownUpdate.add(onRundownUpdate);
    if (onShowcallerUpdate) globalState.onShowcallerUpdate.add(onShowcallerUpdate);
    if (onBlueprintUpdate) globalState.onBlueprintUpdate.add(onBlueprintUpdate);
    
    globalState.refCount++;

    // Create subscription if it doesn't exist
    if (!globalState.subscription) {
      const subscription = supabase
        .channel(`rundown-${rundownId}`)
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'rundowns', filter: `id=eq.${rundownId}` },
          (payload) => processRealtimeUpdate(payload, globalState)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'showcaller_sessions', filter: `rundown_id=eq.${rundownId}` },
          (payload) => processRealtimeUpdate(payload, globalState)
        )
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'blueprints', filter: `rundown_id=eq.${rundownId}` },
          (payload) => processRealtimeUpdate(payload, globalState)
        )
        .subscribe((status) => {
          console.log('📡 Consolidated subscription status:', status);
          globalState!.isConnected = status === 'SUBSCRIBED';
          isConnectedRef.current = status === 'SUBSCRIBED';
          
          if (status === 'SUBSCRIBED') {
            console.log('🔄 Consolidated realtime connected - performing catch-up');
            performCatchupSync(globalState!);
          }
        });

      globalState.subscription = subscription;
    } else {
      isConnectedRef.current = globalState.isConnected;
    }

    // Cleanup function
    return () => {
      if (onRundownUpdate) globalState!.onRundownUpdate.delete(onRundownUpdate);
      if (onShowcallerUpdate) globalState!.onShowcallerUpdate.delete(onShowcallerUpdate);
      if (onBlueprintUpdate) globalState!.onBlueprintUpdate.delete(onBlueprintUpdate);
      
      globalState!.refCount--;
      
      // Remove subscription if no more references
      if (globalState!.refCount === 0) {
        console.log('🔌 Removing consolidated realtime subscription for rundown:', rundownId);
        if (globalState!.subscription) {
          supabase.removeChannel(globalState!.subscription);
        }
        globalSubscriptions.delete(rundownId);
      }
    };
  }, [rundownId, user, enabled, isSharedView, onRundownUpdate, onShowcallerUpdate, onBlueprintUpdate, processRealtimeUpdate, performCatchupSync]);

  return {
    isConnected: isConnectedRef.current,
    isProcessingUpdate: isProcessingUpdateRef.current,
    trackOwnUpdate: (id: string, context?: string) => {
      trackOwnUpdate?.(id, context);
    },
    performCatchupSync: () => {
      const globalState = globalSubscriptions.get(rundownId as string);
      if (globalState) {
        performCatchupSync(globalState);
      }
    }
  };
};