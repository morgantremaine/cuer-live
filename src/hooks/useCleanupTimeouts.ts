import { useEffect, useRef } from 'react';

// Hook to manage timeouts and intervals with automatic cleanup
export const useCleanupTimeouts = () => {
  const timeoutsRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());

  // Wrapped setTimeout with automatic cleanup
  const setTimeout = (callback: () => void, delay: number) => {
    const timeoutId = window.setTimeout(() => {
      timeoutsRef.current.delete(timeoutId);
      callback();
    }, delay);
    
    timeoutsRef.current.add(timeoutId);
    return timeoutId;
  };

  // Wrapped setInterval with automatic cleanup
  const setInterval = (callback: () => void, delay: number) => {
    const intervalId = window.setInterval(callback, delay);
    intervalsRef.current.add(intervalId);
    return intervalId;
  };

  // Manual cleanup functions
  const clearTimeout = (timeoutId: ReturnType<typeof setTimeout>) => {
    window.clearTimeout(timeoutId);
    timeoutsRef.current.delete(timeoutId);
  };

  const clearInterval = (intervalId: ReturnType<typeof setInterval>) => {
    window.clearInterval(intervalId);
    intervalsRef.current.delete(intervalId);
  };

  // Cleanup all timeouts and intervals on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach(timeoutId => window.clearTimeout(timeoutId));
      intervalsRef.current.forEach(intervalId => window.clearInterval(intervalId));
      timeoutsRef.current.clear();
      intervalsRef.current.clear();
    };
  }, []);

  return {
    setTimeout,
    setInterval,
    clearTimeout,
    clearInterval
  };
};