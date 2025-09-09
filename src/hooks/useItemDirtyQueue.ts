/**
 * Item-Level Dirty Queue - Queues remote updates for actively edited items
 * Prevents remote updates from interfering with active typing
 */

import { useCallback, useRef } from 'react';
import { localShadowStore } from '@/stores/localShadowStore';

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
    // Use precise recent typing detection instead of general "active" shadows
    const recentlyTypedFields = localShadowStore.getRecentlyTypedFields(2000); // Only 2 seconds
    const activelyEditedItems = new Set<string>();
    
    recentlyTypedFields.forEach(fieldKey => {
      const [itemId] = fieldKey.split('-');
      if (itemId !== 'global') {
        activelyEditedItems.add(itemId);
      }
    });
    
    // Check if this is a deletion - be more permissive with deletions
    const isLikelyDeletion = payload.new?.items && Array.isArray(payload.new.items) &&
      payload.old?.items && Array.isArray(payload.old.items) &&
      payload.new.items.length < payload.old.items.length;
    
    if (isLikelyDeletion) {
      // For deletions, only protect if the deleted item was edited very recently (500ms)
      const veryRecentFields = localShadowStore.getRecentlyTypedFields(500);
      const hasVeryRecentEdit = veryRecentFields.some(fieldKey => {
        const [itemId] = fieldKey.split('-');
        return payload.old.items.some((item: any) => item.id === itemId && 
          !payload.new.items.some((newItem: any) => newItem.id === item.id));
      });
      
      if (hasVeryRecentEdit) {
        const queuedUpdate: QueuedUpdate = {
          payload,
          timestamp,
          docVersion,
          queuedAt: Date.now()
        };
        
        queueRef.current.push(queuedUpdate);
        console.log('🛡️ ItemDirtyQueue: Queued deletion for very recently edited item', {
          activeItems: Array.from(activelyEditedItems),
          docVersion,
          queueSize: queueRef.current.length
        });
        
        return true; // Deletion was queued due to very recent edit
      }
      
      return false; // Deletion not queued, safe to process immediately
    }
    
    // For regular updates, check if any items are actively being edited
    const isDirty = payload.new?.items && Array.isArray(payload.new.items) &&
      payload.new.items.some((item: any) => activelyEditedItems.has(item.id));
    
    if (isDirty) {
      const queuedUpdate: QueuedUpdate = {
        payload,
        timestamp,
        docVersion,
        queuedAt: Date.now()
      };
      
      queueRef.current.push(queuedUpdate);
      console.log('🛡️ ItemDirtyQueue: Queued update for actively edited items', {
        activeItems: Array.from(activelyEditedItems),
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
    
    // Use precise recent typing detection
    const recentlyTypedFields = localShadowStore.getRecentlyTypedFields(1000); // 1 second for processing
    const activelyEditedItems = new Set<string>();
    
    recentlyTypedFields.forEach(fieldKey => {
      const [itemId] = fieldKey.split('-');
      if (itemId !== 'global') {
        activelyEditedItems.add(itemId);
      }
    });
    
    // Separate safe updates from protected ones
    const safeUpdates: QueuedUpdate[] = [];
    const protectedUpdates: QueuedUpdate[] = [];
    
    queueRef.current.forEach(update => {
      const payload = update.payload;
      const affectsActiveItems = payload.new?.items && Array.isArray(payload.new.items) &&
        payload.new.items.some((item: any) => activelyEditedItems.has(item.id));
      
      if (affectsActiveItems) {
        protectedUpdates.push(update);
      } else {
        safeUpdates.push(update);
      }
    });
    
    // Always process safe updates
    if (safeUpdates.length > 0) {
      console.log('🛡️ ItemDirtyQueue: Processing safe queued updates', {
        safeUpdates: safeUpdates.length,
        protectedUpdates: protectedUpdates.length
      });
      
      safeUpdates.forEach(update => {
        try {
          onApplyUpdate(update);
        } catch (error) {
          console.error('❌ ItemDirtyQueue: Error processing safe update', error);
        }
      });
    }
    
    // Keep only protected updates in queue
    queueRef.current = protectedUpdates;
    
    if (protectedUpdates.length > 0) {
      console.log('🛡️ ItemDirtyQueue: Still actively editing - keeping protected updates queued', {
        activeItems: Array.from(activelyEditedItems),
        queueSize: protectedUpdates.length
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