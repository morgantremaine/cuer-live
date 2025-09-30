/**
 * Item-Level Dirty Queue - Queues remote updates for actively edited items
 * Prevents remote updates from interfering with active typing
 */

import { useCallback, useRef } from 'react';
import { localShadowStore } from '@/state/localShadows';

interface QueuedUpdate {
  payload: any;
  timestamp: string;
  docVersion: number;
  queuedAt: number;
}

export const useItemDirtyQueue = () => {
  const queueRef = useRef<QueuedUpdate[]>([]);
  const processingRef = useRef(false);

  // Add update to queue if items are actively being edited
  const queueIfDirty = useCallback((payload: any, timestamp: string, docVersion: number): boolean => {
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Check if any items in the update are actively being edited
    const isDirty = payload.new?.items && Array.isArray(payload.new.items) &&
      payload.new.items.some((item: any) => activeShadows.items.has(item.id));
    
    if (isDirty) {
      const queuedUpdate: QueuedUpdate = {
        payload,
        timestamp,
        docVersion,
        queuedAt: Date.now()
      };
      
      queueRef.current.push(queuedUpdate);
      console.log('🛡️ ItemDirtyQueue: Queued update for actively edited items', {
        activeItems: Array.from(activeShadows.items.keys()),
        docVersion,
        queueSize: queueRef.current.length
      });
      
      return true; // Update was queued
    }
    
    return false; // Update not queued, safe to process immediately
  }, []);

  // Process queued updates when editing activity stops
  const processQueue = useCallback((onApplyUpdate: (update: QueuedUpdate) => void) => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }
    
    processingRef.current = true;
    const activeShadows = localShadowStore.getActiveShadows();
    
    // Only process updates if no items are actively being edited
    if (activeShadows.items.size === 0) {
      console.log('🛡️ ItemDirtyQueue: Processing queued updates', {
        queueSize: queueRef.current.length
      });
      
      // Process all queued updates
      const updates = [...queueRef.current];
      queueRef.current = [];
      
      updates.forEach(update => {
        try {
          onApplyUpdate(update);
        } catch (error) {
          console.error('❌ ItemDirtyQueue: Error processing queued update', error);
        }
      });
    } else {
      console.log('🛡️ ItemDirtyQueue: Still actively editing - keeping updates queued', {
        activeItems: Array.from(activeShadows.items.keys()),
        queueSize: queueRef.current.length
      });
    }
    
    processingRef.current = false;
  }, []);

  // Clear old queued updates (prevent memory leaks)
  const cleanupQueue = useCallback(() => {
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    
    const before = queueRef.current.length;
    queueRef.current = queueRef.current.filter(update => (now - update.queuedAt) <= maxAge);
    const after = queueRef.current.length;
    
    if (before !== after) {
      console.log('🧹 ItemDirtyQueue: Cleaned up old updates', {
        removed: before - after,
        remaining: after
      });
    }
  }, []);

  // Get queue status
  const getQueueStatus = useCallback(() => {
    return {
      queueSize: queueRef.current.length,
      isProcessing: processingRef.current,
      hasActiveItems: localShadowStore.getActiveShadows().items.size > 0
    };
  }, []);

  return {
    queueIfDirty,
    processQueue,
    cleanupQueue,
    getQueueStatus
  };
};