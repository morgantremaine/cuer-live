import { useEffect, useRef } from 'react';

// Global state to prevent page reloads when switching browser tabs
let isTabVisible = true;
let preventUnload = false;

export const usePageVisibility = () => {
  const wasHiddenRef = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden
        isTabVisible = false;
        wasHiddenRef.current = true;
        preventUnload = true;
        console.log('🔍 Tab became hidden - preventing unload');
      } else {
        // Tab became visible
        isTabVisible = true;
        console.log('🔍 Tab became visible - was hidden:', wasHiddenRef.current);
        
        // Clear prevent unload after a delay
        setTimeout(() => {
          preventUnload = false;
        }, 1000);
      }
    };

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (preventUnload || !isTabVisible) {
        console.log('🛑 Preventing page unload due to tab switch');
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
    };

    const handleUnload = () => {
      if (!isTabVisible) {
        console.log('🛑 Page unload prevented for inactive tab');
      }
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Prevent unload when tab is inactive
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('unload', handleUnload);

    // Initial state
    isTabVisible = !document.hidden;

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('unload', handleUnload);
    };
  }, []);

  return {
    isTabVisible,
    wasHidden: wasHiddenRef.current
  };
};