import { useRef, useCallback, useEffect } from 'react';

/**
 * Performance-optimized cell broadcast throttling hook
 * Prevents broadcast storms in large rundowns by batching updates
 */
export const useCellBroadcastThrottle = (itemCount: number = 0) => {
  const pendingBroadcasts = useRef<Map<string, { value: any; timestamp: number }>>(new Map());
  const broadcastTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const isThrottlingEnabled = useRef(itemCount > 100);

  // Dynamic throttling based on rundown size
  const getThrottleDelay = useCallback(() => {
    if (itemCount > 200) return 1000; // Very large rundowns: 1 second
    if (itemCount > 150) return 750;  // Large rundowns: 750ms 
    if (itemCount > 100) return 500;  // Medium rundowns: 500ms
    return 100; // Small rundowns: minimal delay
  }, [itemCount]);

  // Throttled broadcast function
  const throttledBroadcast = useCallback((
    key: string,
    broadcastFn: () => void,
    value?: any
  ) => {
    if (!isThrottlingEnabled.current) {
      // No throttling for small rundowns
      broadcastFn();
      return;
    }

    // Clear existing timeout for this key
    const existingTimeout = broadcastTimeouts.current.get(key);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Store the latest value
    pendingBroadcasts.current.set(key, {
      value,
      timestamp: Date.now()
    });

    // Schedule the broadcast
    const timeoutId = setTimeout(() => {
      const pending = pendingBroadcasts.current.get(key);
      if (pending) {
        broadcastFn();
        pendingBroadcasts.current.delete(key);
        broadcastTimeouts.current.delete(key);
      }
    }, getThrottleDelay());

    broadcastTimeouts.current.set(key, timeoutId);
  }, [getThrottleDelay, itemCount]);

  // Flush all pending broadcasts (for cleanup)
  const flushPendingBroadcasts = useCallback(() => {
    for (const [key, timeoutId] of broadcastTimeouts.current.entries()) {
      clearTimeout(timeoutId);
    }
    
    broadcastTimeouts.current.clear();
    pendingBroadcasts.current.clear();
  }, []);

  // Update throttling status when item count changes
  useEffect(() => {
    isThrottlingEnabled.current = itemCount > 100;
    
    // Clean up if rundown becomes small
    if (!isThrottlingEnabled.current) {
      flushPendingBroadcasts();
    }
  }, [itemCount, flushPendingBroadcasts]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      flushPendingBroadcasts();
    };
  }, [flushPendingBroadcasts]);

  return {
    throttledBroadcast,
    flushPendingBroadcasts,
    isThrottling: isThrottlingEnabled.current,
    pendingCount: pendingBroadcasts.current.size
  };
};