import { useEffect, useRef } from 'react';
import { timerManager } from '@/services/TimerManager';

/**
 * Hook that provides managed timer functions with automatic cleanup
 * Replaces direct setTimeout/setInterval usage in components
 */
export const useUniversalTimer = (componentName: string) => {
  const activeTimersRef = useRef<Set<string>>(new Set());

  // Wrapped setTimeout with automatic tracking and cleanup
  const setTimeout = (callback: () => void, delay: number): string => {
    const timerId = timerManager.setTimeout(() => {
      activeTimersRef.current.delete(timerId);
      callback();
    }, delay, componentName);
    
    activeTimersRef.current.add(timerId);
    return timerId;
  };

  // Wrapped setInterval with automatic tracking and cleanup
  const setInterval = (callback: () => void, delay: number): string => {
    const timerId = timerManager.setInterval(callback, delay, componentName);
    activeTimersRef.current.add(timerId);
    return timerId;
  };

  // Clear specific timer
  const clearTimer = (timerId: string): boolean => {
    activeTimersRef.current.delete(timerId);
    return timerManager.clearTimer(timerId);
  };

  // Clear all timers for this component
  const clearAllTimers = (): void => {
    activeTimersRef.current.forEach(timerId => {
      timerManager.clearTimer(timerId);
    });
    activeTimersRef.current.clear();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, []);

  return {
    setTimeout,
    setInterval,
    clearTimer,
    clearAllTimers
  };
};