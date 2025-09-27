import { useEffect, useState, useRef } from 'react';

// Hook to detect when tab comes back into focus for refresh functionality
export const useTabFocus = () => {
  const [isTabActive, setIsTabActive] = useState(true);
  const wasTabInactive = useRef(false);

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabActive(isVisible);
      
      if (isVisible && wasTabInactive.current) {
        // Tab came back into focus after being inactive
        console.log('📱 Tab refocused - triggering refresh');
        wasTabInactive.current = false;
      } else if (!isVisible) {
        // Tab became inactive
        wasTabInactive.current = true;
      }
    };

    const handleFocus = () => {
      setIsTabActive(true);
      if (wasTabInactive.current) {
        console.log('📱 Window refocused - triggering refresh');
        wasTabInactive.current = false;
      }
    };

    const handleBlur = () => {
      setIsTabActive(false);
      wasTabInactive.current = true;
    };

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Listen for window focus/blur
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  return { isTabActive, wasTabInactive: wasTabInactive.current };
};