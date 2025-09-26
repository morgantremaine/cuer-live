import { useEffect, useState, useRef } from 'react';
import { attemptAuthRefresh, showAuthErrorToast } from '@/utils/authErrorHandler';

// Hook to detect when tab comes back into focus for refresh functionality
export const useTabFocus = () => {
  const [isTabActive, setIsTabActive] = useState(true);
  const wasTabInactive = useRef(false);
  const lastSessionCheckRef = useRef<number>(0);

  // Proactive session health check for laptop sleep scenarios
  const checkSessionHealth = async () => {
    const now = Date.now();
    
    // Only check once per 30 seconds to avoid excessive checks
    if (now - lastSessionCheckRef.current < 30000) {
      return;
    }
    
    lastSessionCheckRef.current = now;
    
    try {
      console.log('🔍 Tab Focus: Checking session health...');
      
      // Quick session validation - if this fails, token is likely expired
      const { data: { session }, error } = await (await import('@/integrations/supabase/client')).supabase.auth.getSession();
      
      if (error || !session) {
        console.log('⚠️ Tab Focus: Session invalid, attempting refresh...');
        const refreshSuccessful = await attemptAuthRefresh();
        
        if (!refreshSuccessful) {
          console.log('❌ Tab Focus: Session refresh failed - showing auth error');
          showAuthErrorToast();
        } else {
          console.log('✅ Tab Focus: Session refreshed successfully');
        }
      } else {
        console.log('✅ Tab Focus: Session healthy');
      }
    } catch (error) {
      console.warn('⚠️ Tab Focus: Session health check failed:', error);
    }
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      const isVisible = !document.hidden;
      setIsTabActive(isVisible);
      
      if (isVisible && wasTabInactive.current) {
        // Tab came back into focus after being inactive
        console.log('📱 Tab refocused - checking session health');
        wasTabInactive.current = false;
        
        // Check session health proactively when returning from potential sleep
        checkSessionHealth();
      } else if (!isVisible) {
        // Tab became inactive
        wasTabInactive.current = true;
      }
    };

    const handleFocus = () => {
      setIsTabActive(true);
      if (wasTabInactive.current) {
        console.log('📱 Window refocused - checking session health');
        wasTabInactive.current = false;
        
        // Check session health when window regains focus
        checkSessionHealth();
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

  return { 
    isTabActive, 
    wasTabInactive: wasTabInactive.current,
    checkSessionHealth 
  };
};