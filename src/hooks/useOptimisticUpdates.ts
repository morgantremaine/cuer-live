
import { useCallback, useRef, useState } from 'react';
import { RundownItem } from '@/types/rundown';

interface OptimisticUpdate {
  id: string;
  itemId: string;
  field: string;
  value: string;
  timestamp: number;
  userId?: string;
}

export const useOptimisticUpdates = () => {
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, OptimisticUpdate>>(new Map());
  const updateTimeoutRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const addOptimisticUpdate = useCallback((itemId: string, field: string, value: string, userId?: string) => {
    const updateId = `${itemId}-${field}`;
    const update: OptimisticUpdate = {
      id: updateId,
      itemId,
      field,
      value,
      timestamp: Date.now(),
      userId
    };

    setPendingUpdates(prev => new Map(prev.set(updateId, update)));

    // Clear any existing timeout for this update
    const existingTimeout = updateTimeoutRef.current.get(updateId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set a timeout to remove the optimistic update (fallback)
    const timeout = setTimeout(() => {
      setPendingUpdates(prev => {
        const newMap = new Map(prev);
        newMap.delete(updateId);
        return newMap;
      });
      updateTimeoutRef.current.delete(updateId);
    }, 10000); // 10 second fallback

    updateTimeoutRef.current.set(updateId, timeout);

    return updateId;
  }, []);

  const confirmOptimisticUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(updateId);
      return newMap;
    });

    const timeout = updateTimeoutRef.current.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      updateTimeoutRef.current.delete(updateId);
    }
  }, []);

  const revertOptimisticUpdate = useCallback((updateId: string) => {
    setPendingUpdates(prev => {
      const newMap = new Map(prev);
      newMap.delete(updateId);
      return newMap;
    });

    const timeout = updateTimeoutRef.current.get(updateId);
    if (timeout) {
      clearTimeout(timeout);
      updateTimeoutRef.current.delete(updateId);
    }
  }, []);

  const applyOptimisticUpdates = useCallback((items: RundownItem[]): RundownItem[] => {
    if (pendingUpdates.size === 0) return items;

    return items.map(item => {
      let updatedItem = { ...item };
      
      // Apply all pending updates for this item
      pendingUpdates.forEach((update) => {
        if (update.itemId === item.id) {
          updatedItem = {
            ...updatedItem,
            [update.field]: update.value
          };
        }
      });

      return updatedItem;
    });
  }, [pendingUpdates]);

  const clearAllOptimisticUpdates = useCallback(() => {
    // Clear all timeouts
    updateTimeoutRef.current.forEach(timeout => clearTimeout(timeout));
    updateTimeoutRef.current.clear();
    
    // Clear all pending updates
    setPendingUpdates(new Map());
  }, []);

  return {
    pendingUpdates: Array.from(pendingUpdates.values()),
    addOptimisticUpdate,
    confirmOptimisticUpdate,
    revertOptimisticUpdate,
    applyOptimisticUpdates,
    clearAllOptimisticUpdates,
    hasPendingUpdates: pendingUpdates.size > 0
  };
};
