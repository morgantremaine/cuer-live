import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getTabId } from '@/utils/tabUtils';
import { useCellUpdateCoordination } from './useCellUpdateCoordination';

interface UseSimpleRealtimeCollaborationProps {
  rundownId: string | null;
  onRemoteUpdate: (data: any) => void;
  enabled?: boolean;
}

/**
 * SIMPLIFIED REAL-TIME COLLABORATION
 * 
 * Core principles:
 * 1. NO OCC (Optimistic Concurrency Control) - removes all doc_version blocking
 * 2. Per-cell protection only - if user is typing in a cell, defer just that cell
 * 3. Last-writer-wins for same cell conflicts
 * 4. Immediate application of all other remote changes
 * 5. No queues, no LocalShadow, no complex conflict resolution
 */
export const useSimpleRealtimeCollaboration = ({
  rundownId,
  onRemoteUpdate,
  enabled = true
}: UseSimpleRealtimeCollaborationProps) => {
  const { user } = useAuth();
  const subscriptionRef = useRef<any>(null);
  const lastUpdateTimestampRef = useRef<string | null>(null);
  const onRemoteUpdateRef = useRef(onRemoteUpdate);
  
  // Track actively typed cells (simple field-level tracking)
  const activelyTypedCellsRef = useRef<Set<string>>(new Set());
  const cellTypingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  const { cellUpdateInProgressRef } = useCellUpdateCoordination();
  
  // Keep refs updated
  onRemoteUpdateRef.current = onRemoteUpdate;

  // Simple cell activity tracking API
  const markCellActive = useCallback((cellKey: string) => {
    activelyTypedCellsRef.current.add(cellKey);
    
    // Clear existing timeout
    const existingTimeout = cellTypingTimeoutsRef.current.get(cellKey);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }
    
    // Set new timeout to clear cell after typing stops
    const timeout = setTimeout(() => {
      activelyTypedCellsRef.current.delete(cellKey);
      cellTypingTimeoutsRef.current.delete(cellKey);
    }, 1000); // 1 second after last keystroke
    
    cellTypingTimeoutsRef.current.set(cellKey, timeout);
  }, []);

  const handleRealtimeUpdate = useCallback(async (payload: any) => {
    console.log('📱 Simple realtime update received:', {
      event: payload.eventType,
      rundownId: payload.new?.id,
      updatedByUserId: payload.new?.last_updated_by,
      currentUserId: user?.id,
      timestamp: payload.new?.updated_at,
      tabId: payload.new?.tab_id,
      ownTabId: getTabId()
    });
    
    // Skip if this is our own update (same tab)
    if (payload.new?.tab_id === getTabId()) {
      console.log('⏭️ Skipping own update (same tab)');
      return;
    }

    // Skip if not for the current rundown
    if (payload.new?.id !== rundownId) {
      console.log('⏭️ Skipping - different rundown');
      return;
    }

    // Simple timestamp deduplication
    const updateTimestamp = payload.new?.updated_at;
    if (updateTimestamp && updateTimestamp === lastUpdateTimestampRef.current) {
      console.log('⏭️ Skipping duplicate timestamp');
      return;
    }
    lastUpdateTimestampRef.current = updateTimestamp;

    console.log('✅ Processing remote update with simple per-cell protection');
    
    try {
      // Simple field protection: only protect actively typed cells
      const activeCells = Array.from(activelyTypedCellsRef.current);
      const protectedUpdate = { ...payload.new };
      
      if (activeCells.length > 0) {
        console.log('🛡️ Protecting actively typed cells:', activeCells);
        
        // If we have items, protect individual cell changes
        if (protectedUpdate.items && Array.isArray(protectedUpdate.items)) {
          protectedUpdate.items = protectedUpdate.items.map((remoteItem: any, index: number) => {
            const itemId = remoteItem.id;
            
            // Check if any field of this item is being actively typed
            const hasActiveField = activeCells.some(cellKey => 
              cellKey.startsWith(`${itemId}-`) || cellKey === `item-${index}`
            );
            
            if (hasActiveField) {
              // Keep the current local version for this item
              // The callback will handle merging with current state
              return { ...remoteItem, _skipMerge: true, _itemId: itemId };
            }
            
            return remoteItem;
          });
        }
        
        // Protect global fields if they're being typed
        if (activeCells.includes('title')) {
          delete protectedUpdate.title;
        }
        if (activeCells.includes('startTime')) {
          delete protectedUpdate.start_time;
        }
        if (activeCells.includes('timezone')) {
          delete protectedUpdate.timezone;
        }
        if (activeCells.includes('externalNotes')) {
          delete protectedUpdate.external_notes;
        }
      }
      
      // Apply the update immediately - no queuing, no blocking
      onRemoteUpdateRef.current({
        ...protectedUpdate,
        _isRemoteUpdate: true,
        _protectedCells: activeCells
      });
      
    } catch (error) {
      console.error('Error processing simple realtime update:', error);
    }
  }, [rundownId, user?.id]);

  useEffect(() => {
    // Clear any existing subscription
    if (subscriptionRef.current) {
      console.log('🧹 Cleaning up existing simple realtime subscription');
      supabase.removeChannel(subscriptionRef.current);
      subscriptionRef.current = null;
    }

    // Only set up subscription if we have the required data
    if (!rundownId || !user || !enabled) {
      return;
    }

    console.log('✅ Setting up simple realtime subscription for rundown:', rundownId);

    const channel = supabase
      .channel(`simple-realtime-${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rundowns',
          filter: `id=eq.${rundownId}`
        },
        handleRealtimeUpdate
      )
      .subscribe((status) => {
        console.log('📱 Simple realtime subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to simple realtime updates');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Failed to subscribe to simple realtime updates');
        }
      });

    subscriptionRef.current = channel;

    return () => {
      if (subscriptionRef.current) {
        console.log('🧹 Cleaning up simple realtime subscription on unmount');
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
      }
    };
  }, [rundownId, user, enabled, handleRealtimeUpdate]);

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      cellTypingTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      cellTypingTimeoutsRef.current.clear();
    };
  }, []);

  return {
    isConnected: !!subscriptionRef.current,
    markCellActive,
    activeCells: Array.from(activelyTypedCellsRef.current)
  };
};
