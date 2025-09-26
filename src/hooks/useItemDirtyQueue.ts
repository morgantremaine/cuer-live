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

  // Split updates by item - queue conflicting items, return non-conflicting ones for immediate processing
  const queueIfDirty = useCallback((payload: any, timestamp: string, docVersion: number): { shouldQueue: boolean; immediatePayload?: any } => {
    const activeShadows = localShadowStore.getActiveShadows();
    
    if (!payload.new?.items || !Array.isArray(payload.new.items)) {
      return { shouldQueue: false }; // No items to check, process immediately
    }
    
    const conflictingItems: any[] = [];
    const nonConflictingItems: any[] = [];
    
    // Split items based on whether they're actively being edited
    payload.new.items.forEach((item: any) => {
      if (activeShadows.items.has(item.id)) {
        conflictingItems.push(item);
      } else {
        nonConflictingItems.push(item);
      }
    });
    
    // Queue conflicting items if any exist
    if (conflictingItems.length > 0) {
      const queuedUpdate: QueuedUpdate = {
        payload: {
          ...payload,
          new: {
            ...payload.new,
            items: conflictingItems
          }
        },
        timestamp,
        docVersion,
        queuedAt: Date.now()
      };
      
      queueRef.current.push(queuedUpdate);
      console.log('🛡️ ItemDirtyQueue: Queued update for actively edited items', {
        conflictingItems: conflictingItems.map(item => item.id),
        nonConflictingItems: nonConflictingItems.map(item => item.id),
        activeItems: Array.from(activeShadows.items.keys()),
        docVersion,
        queueSize: queueRef.current.length
      });
    }
    
    // Return immediate payload with non-conflicting items if any exist
    const immediatePayload = nonConflictingItems.length > 0 ? {
      ...payload,
      new: {
        ...payload.new,
        items: nonConflictingItems
      }
    } : undefined;
    
    return { 
      shouldQueue: conflictingItems.length > 0,
      immediatePayload
    };
  }, []);

  // Process queued updates individually when items are no longer being edited
  const processQueue = useCallback((onApplyUpdate: (update: QueuedUpdate) => void) => {
    if (processingRef.current || queueRef.current.length === 0) {
      return;
    }
    
    processingRef.current = true;
    const activeShadows = localShadowStore.getActiveShadows();
    
    const processableUpdates: QueuedUpdate[] = [];
    const stillBlockedUpdates: QueuedUpdate[] = [];
    
    // Split queued updates into processable vs still blocked
    queueRef.current.forEach(queuedUpdate => {
      const processableItems: any[] = [];
      const blockedItems: any[] = [];
      
      if (queuedUpdate.payload.new?.items && Array.isArray(queuedUpdate.payload.new.items)) {
        queuedUpdate.payload.new.items.forEach((item: any) => {
          if (activeShadows.items.has(item.id)) {
            blockedItems.push(item);
          } else {
            processableItems.push(item);
          }
        });
      }
      
      // If we have processable items, create an update for them
      if (processableItems.length > 0) {
        processableUpdates.push({
          ...queuedUpdate,
          payload: {
            ...queuedUpdate.payload,
            new: {
              ...queuedUpdate.payload.new,
              items: processableItems
            }
          }
        });
      }
      
      // If we have blocked items, keep them queued
      if (blockedItems.length > 0) {
        stillBlockedUpdates.push({
          ...queuedUpdate,
          payload: {
            ...queuedUpdate.payload,
            new: {
              ...queuedUpdate.payload.new,
              items: blockedItems
            }
          }
        });
      }
    });
    
    // Update queue with still blocked items
    queueRef.current = stillBlockedUpdates;
    
    if (processableUpdates.length > 0) {
      console.log('🛡️ ItemDirtyQueue: Processing partial queued updates', {
        processableCount: processableUpdates.length,
        stillBlockedCount: stillBlockedUpdates.length,
        activeItems: Array.from(activeShadows.items.keys())
      });
      
      // Process the processable updates
      processableUpdates.forEach(update => {
        try {
          onApplyUpdate(update);
        } catch (error) {
          console.error('❌ ItemDirtyQueue: Error processing queued update', error);
        }
      });
    } else if (queueRef.current.length > 0) {
      console.log('🛡️ ItemDirtyQueue: All queued updates still blocked', {
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