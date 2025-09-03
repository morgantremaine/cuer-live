import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RundownItem } from '@/types/rundown';
import { logger } from '@/utils/logger';

interface PerRowRealtimeOptions {
  rundownId: string;
  onItemsChange: (items: RundownItem[]) => void;
  enabled?: boolean;
}

export const usePerRowRealtime = ({ rundownId, onItemsChange, enabled = true }: PerRowRealtimeOptions) => {
  const subscriptionRef = useRef<any>(null);
  const itemsMapRef = useRef<Map<string, { item: RundownItem; index: number }>>(new Map());

  // Handle individual item updates from realtime
  const handleItemUpdate = useCallback((payload: any) => {
    const { new: newRecord, old: oldRecord, eventType } = payload;
    
    logger.debug('Per-row realtime update:', { eventType, itemId: newRecord?.item_id || oldRecord?.item_id });

    switch (eventType) {
      case 'INSERT':
      case 'UPDATE':
        if (newRecord) {
          itemsMapRef.current.set(newRecord.item_id, {
            item: newRecord.item_data as RundownItem,
            index: newRecord.item_index
          });
        }
        break;
      
      case 'DELETE':
        if (oldRecord) {
          itemsMapRef.current.delete(oldRecord.item_id);
        }
        break;
    }

    // Reconstruct sorted items array and notify parent
    const sortedItems = Array.from(itemsMapRef.current.values())
      .sort((a, b) => a.index - b.index)
      .map(entry => entry.item);
    
    onItemsChange(sortedItems);
  }, [onItemsChange]);

  // Load initial state into items map
  const initializeItemsMap = useCallback(async () => {
    if (!rundownId) return;

    try {
      const { data, error } = await supabase
        .from('rundown_items')
        .select('*')
        .eq('rundown_id', rundownId)
        .order('item_index');

      if (error) throw error;

      // Clear and populate items map
      itemsMapRef.current.clear();
      data?.forEach(row => {
        itemsMapRef.current.set(row.item_id, {
          item: row.item_data as RundownItem,
          index: row.item_index
        });
      });

      // Initial load notification
      const sortedItems = Array.from(itemsMapRef.current.values())
        .sort((a, b) => a.index - b.index)
        .map(entry => entry.item);
      
      onItemsChange(sortedItems);
      logger.debug('Initialized per-row realtime state:', { count: sortedItems.length });
    } catch (error) {
      logger.error('Failed to initialize per-row realtime state:', error);
    }
  }, [rundownId, onItemsChange]);

  useEffect(() => {
    if (!enabled || !rundownId) return;

    // Initialize state first
    initializeItemsMap();

    // Set up realtime subscription
    const channel = supabase
      .channel(`rundown_items:${rundownId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rundown_items',
          filter: `rundown_id=eq.${rundownId}`
        },
        handleItemUpdate
      )
      .subscribe();

    subscriptionRef.current = channel;

    logger.debug('Per-row realtime subscription started:', { rundownId });

    // Cleanup
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
        subscriptionRef.current = null;
        logger.debug('Per-row realtime subscription stopped');
      }
    };
  }, [rundownId, enabled, handleItemUpdate, initializeItemsMap]);

  return {
    isConnected: !!subscriptionRef.current
  };
};