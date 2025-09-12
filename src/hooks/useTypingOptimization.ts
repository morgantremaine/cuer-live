import { useCallback, useRef, useEffect } from 'react';
import { useMemoryMonitor } from './useMemoryMonitor';

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
  
  // Monitor memory during typing
  const { forceCheck } = useMemoryMonitor({
    rundownId: 'typing-session',
    itemCount,
    enabled: isLargeRundown
  });
  
  // Aggressive debouncing for large rundowns
  const DEBOUNCE_MS = isLargeRundown ? 200 : 150; // Increased debounce
  const BATCH_SIZE = isLargeRundown ? 3 : 5; // Smaller batches

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
        // Schedule next batch with minimal delay
        setTimeout(() => processBatch(endIndex), 16); // ~60fps
      } else {
        // Force memory check after typing session
        if (isLargeRundown) {
          setTimeout(forceCheck, 100);
        }
      }
    };
    
    processBatch(0);
    pendingUpdatesRef.current.clear();
    lastFlushRef.current = now;
    
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
      flushTimeoutRef.current = null;
    }
  }, [onUpdateItem, BATCH_SIZE, isLargeRundown, forceCheck]);

  const optimizedUpdateItem = useCallback((itemId: string, field: string, value: string) => {
    const key = `${itemId}-${field}`;
    const now = Date.now();
    
    // Store the update (overwrites previous value for same field)
    pendingUpdatesRef.current.set(key, {
      field,
      value,
      timestamp: now
    });
    
    // Clear existing timeout
    if (flushTimeoutRef.current) {
      clearTimeout(flushTimeoutRef.current);
    }
    
    // Schedule flush with longer delay for large rundowns
    flushTimeoutRef.current = setTimeout(flushPendingUpdates, DEBOUNCE_MS);
    
  }, [flushPendingUpdates, DEBOUNCE_MS]);

  // Force flush on unmount or tab switch
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && pendingUpdatesRef.current.size > 0) {
        flushPendingUpdates();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
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