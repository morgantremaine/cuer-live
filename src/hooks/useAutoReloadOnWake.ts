import { useEffect, useRef } from 'react';

/**
 * Detects when the computer wakes from sleep by monitoring for "time jumps".
 * When JavaScript is frozen during sleep, the time between interval ticks becomes
 * much longer than expected. This triggers an immediate page reload to ensure
 * fresh WebSocket connections and data.
 * 
 * Does NOT reload when:
 * - Tab is in background or on another monitor (JavaScript still runs normally)
 * - Network hiccups or temporary disconnections occur
 * - User switches between tabs quickly
 */
export const useAutoReloadOnWake = () => {
  const lastCheckTimeRef = useRef<number>(Date.now());
  const TIME_JUMP_THRESHOLD_MS = 5000; // 5 seconds
  const CHECK_INTERVAL_MS = 1000; // Check every second

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = now - lastCheckTimeRef.current;
      
      // If more than 5 seconds elapsed but we only waited 1 second,
      // the computer must have been asleep (JavaScript was frozen)
      if (elapsed > TIME_JUMP_THRESHOLD_MS) {
        console.log(`⏰ Time jump detected: ${Math.round(elapsed / 1000)}s elapsed - computer was asleep, reloading immediately...`);
        window.location.reload();
        return;
      }
      
      // Normal tick - update last check time
      lastCheckTimeRef.current = now;
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);
};
