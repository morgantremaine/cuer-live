import { useEffect, useRef } from 'react';

/**
 * Automatically reloads the page when laptop wakes from sleep or tab regains focus
 * after being hidden for a significant period. This ensures users always see the
 * latest data and avoids stale WebSocket connection issues.
 */
export const useAutoReloadOnWake = () => {
  const wasHiddenRef = useRef(false);
  const hiddenTimestampRef = useRef<number>(0);
  const MIN_HIDDEN_TIME_MS = 5000; // Only reload if hidden for 5+ seconds

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden - record timestamp
        wasHiddenRef.current = true;
        hiddenTimestampRef.current = Date.now();
        console.log('💤 Tab hidden - will reload on wake if hidden > 5s');
      } else if (wasHiddenRef.current) {
        // Tab became visible again
        const hiddenDuration = Date.now() - hiddenTimestampRef.current;
        
        if (hiddenDuration > MIN_HIDDEN_TIME_MS) {
          console.log(`🔄 Tab visible after ${Math.round(hiddenDuration / 1000)}s - reloading to ensure fresh state`);
          window.location.reload();
        } else {
          console.log(`⚡ Quick tab switch (${Math.round(hiddenDuration / 1000)}s) - no reload needed`);
          wasHiddenRef.current = false;
        }
      }
    };

    const handleFocus = () => {
      if (wasHiddenRef.current) {
        const hiddenDuration = Date.now() - hiddenTimestampRef.current;
        
        if (hiddenDuration > MIN_HIDDEN_TIME_MS) {
          console.log(`🔄 Window focused after ${Math.round(hiddenDuration / 1000)}s - reloading to ensure fresh state`);
          window.location.reload();
        }
      }
    };

    const handleBlur = () => {
      wasHiddenRef.current = true;
      hiddenTimestampRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);
};
