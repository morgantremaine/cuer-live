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
  const activeTypingRef = useRef<boolean>(false);
  
  // More aggressive debouncing for large rundowns
  const DEBOUNCE_MS = isLargeRundown ? 200 : 150;
  const BATCH_SIZE = isLargeRundown ? 3 : 5;
  const TYPING_TIMEOUT = 1000; // Consider typing stopped after 1 second

  const flushPendingUpdates = useCallback(() => {
    const now = Date.now();
    const updates = Array.from(pendingUpdatesRef.current.entries());
    
    if (updates.length === 0) {
      activeTypingRef.current = false;
      return;
    }
    
    console.log(`⚡ Flushing ${updates.length} typing updates (memory optimization)`);
    
    // Process updates in small batches to prevent UI blocking
    const processBatch = (startIndex: number) => {
      const endIndex = Math.min(startIndex + BATCH_SIZE, updates.length);
      
      // Use requestAnimationFrame for smoother updates
      requestAnimationFrame(() => {
        for (let i = startIndex; i < endIndex; i++) {
          const [key, { field, value }] = updates[i];
          const itemId = key.split('-')[0];
          onUpdateItem(itemId, field, value);
        }
        
        if (endIndex < updates.length) {
          // Schedule next batch with minimal delay
          setTimeout(() => processBatch(endIndex), 0);
        } else {
          // All batches processed
          activeTypingRef.current = false;
        }
      });
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
    
    // Mark as actively typing
    activeTypingRef.current = true;
    
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
    
    // Schedule flush with debouncing
    flushTimeoutRef.current = setTimeout(flushPendingUpdates, DEBOUNCE_MS);
    
  }, [flushPendingUpdates, DEBOUNCE_MS]);

  // Auto-detect when typing has stopped
  useEffect(() => {
    if (!activeTypingRef.current) return;
    
    const typingStopTimeout = setTimeout(() => {
      if (activeTypingRef.current && pendingUpdatesRef.current.size > 0) {
        console.log('🛑 Typing timeout reached, force flushing updates');
        flushPendingUpdates();
      }
    }, TYPING_TIMEOUT);
    
    return () => clearTimeout(typingStopTimeout);
  }, [flushPendingUpdates, TYPING_TIMEOUT]);

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
    hasPendingUpdates: () => pendingUpdatesRef.current.size > 0,
    isActivelyTyping: () => activeTypingRef.current
  };
};