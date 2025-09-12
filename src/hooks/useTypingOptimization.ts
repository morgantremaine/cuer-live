import { useRef, useCallback, useEffect } from 'react';

interface UseTypingOptimizationProps {
  itemCount: number;
  onUpdateItem: (id: string, field: string, value: string) => void;
  isLargeRundown?: boolean;
}

/**
 * Optimizes typing performance by debouncing updates and batching changes
 */
export const useTypingOptimization = ({
  itemCount,
  onUpdateItem,
  isLargeRundown = false
}: UseTypingOptimizationProps) => {
  const pendingUpdatesRef = useRef<Map<string, { field: string; value: string; timestamp: number }>>(new Map());
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFlushRef = useRef<number>(0);
  
  // Aggressive debouncing for large rundowns
  const DEBOUNCE_MS = isLargeRundown ? 150 : 100;
  const BATCH_SIZE = isLargeRundown ? 5 : 10;

  const flushPendingUpdates = useCallback(() => {
    const now = Date.now();
    const updates = Array.from(pendingUpdatesRef.current.entries());
    
    if (updates.length === 0) return;
    
    console.log(`⚡ Flushing ${updates.length} typing updates for performance`);
    
    // Process updates in batches to prevent UI blocking
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, updates.length);
      
      for (let i = startIndex; i < endIndex; i++) {
        const [key, { field, value }] = updates[i];
        const itemId = key.split('-')[0];
        onUpdateItem(itemId, field, value);
      }
      
      if (endIndex < updates.length) {
        // Schedule next batch
        setTimeout(() => processBatch(endIndex), 0);
      }
    };
    
    processBatch(0);
    pendingUpdatesRef.current.clear();
    lastFlushRef.current = now;
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, [onUpdateItem, BATCH_SIZE]);

  const optimizedUpdateItem = useCallback((itemId: string, field: string, value: string) => {
    const key = `${itemId}-${field}`;
    const now = Date.now();
    
    // Store the update
    pendingUpdatesRef.current.set(key, {
      field,
      value,
      timestamp: now
    });
    
    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    // Schedule flush
    flushTimeoutRef.current = setTimeout(flushPendingUpdates, DEBOUNCE_MS);
    
  }, [flushPendingUpdates, DEBOUNCE_MS]);

  // Force flush on unmount
  useEffect(() => {
    return () => {
      if (pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    };
  }, [flushPendingUpdates]);

  return {
    optimizedUpdateItem,
    flushPendingUpdates,
    hasPendingUpdates: () => pendingUpdatesRef.current.size > 0
  };
};