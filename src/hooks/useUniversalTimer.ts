/**
 * Universal Timer Hook - Memory-safe timer management for React components
 * Automatically cleans up timers when component unmounts
 */

import { useCallback, useEffect, useRef } from 'react';
import { timerManager } from '@/services/TimerManager';

interface UseUniversalTimerReturn {
  setTimeout: (callback: () => void, delay: number) => string;
  setInterval: (callback: () => void, delay: number) => string;
  clearTimer: (id: string) => boolean;
  clearAllTimers: () => number;
}

export const useUniversalTimer = (componentName?: string): UseUniversalTimerReturn => {
  const timerIdsRef = useRef<Set<string>>(new Set());
  const componentId = componentName || 'UnknownComponent';

  // Clean up all timers when component unmounts
  useEffect(() => {
    return () => {
      // Clear all timers created by this hook instance
      const timersCleared = Array.from(timerIdsRef.current).reduce((count, id) => {
        return timerManager.clearTimer(id) ? count + 1 : count;
      }, 0);

      if (timersCleared > 0) {
        console.log(`🧹 Cleaned up ${timersCleared} timers for ${componentId}`);
      }
    };
  }, [componentId]);

  const setTimeout = useCallback((callback: () => void, delay: number): string => {
    const timerId = timerManager.setTimeout(() => {
      // Remove from tracking after execution
      timerIdsRef.current.delete(timerId);
      callback();
    }, delay, componentId);
    
    timerIdsRef.current.add(timerId);
    return timerId;
  }, [componentId]);

  const setInterval = useCallback((callback: () => void, delay: number): string => {
    const timerId = timerManager.setInterval(callback, delay, componentId);
    timerIdsRef.current.add(timerId);
    return timerId;
  }, [componentId]);

  const clearTimer = useCallback((id: string): boolean => {
    timerIdsRef.current.delete(id);
    return timerManager.clearTimer(id);
  }, []);

  const clearAllTimers = useCallback((): number => {
    let clearedCount = 0;
    
    for (const id of timerIdsRef.current) {
      if (timerManager.clearTimer(id)) {
        clearedCount++;
      }
    }
    
    timerIdsRef.current.clear();
    return clearedCount;
  }, []);

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers
  };
};