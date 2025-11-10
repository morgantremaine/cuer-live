import { useState, useCallback, useRef, useEffect } from 'react';

interface UseRealtimeActivityIndicatorProps {
  isProcessingUpdate: boolean;
  minimumDuration?: number; // Minimum time to show indicator (prevents flickering)
  cooldownDuration?: number; // Time to wait after last update before hiding
}

export const useRealtimeActivityIndicator = ({
  isProcessingUpdate,
  minimumDuration = 1500, // 1.5 seconds minimum
  cooldownDuration = 1000   // 1 second cooldown after last update
}: UseRealtimeActivityIndicatorProps) => {
  const [isShowingActivity, setIsShowingActivity] = useState(false);
  const showStartTimeRef = useRef<number | null>(null);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const minimumTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Clear all timeouts helper
  const clearTimeouts = useCallback(() => {
    if (cooldownTimeoutRef.current) {
      clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = null;
    }
    if (minimumTimeoutRef.current) {
      clearTimeout(minimumTimeoutRef.current);
      minimumTimeoutRef.current = null;
    }
  }, []);

  // Handle when processing starts
  const startActivity = useCallback(() => {
    console.log('📺 Realtime activity: Starting indicator');
    setIsShowingActivity(true);
    showStartTimeRef.current = Date.now();
    
    // Clear any existing cooldown
    clearTimeouts();
  }, [clearTimeouts]);

  // Handle when processing stops with proper timing
  const stopActivity = useCallback(() => {
    const now = Date.now();
    const showDuration = showStartTimeRef.current ? now - showStartTimeRef.current : 0;
    const remainingMinimumTime = minimumDuration - showDuration;

    console.log('📺 Realtime activity: Processing stopped', {
      showDuration,
      remainingMinimumTime,
      needsMinimumWait: remainingMinimumTime > 0
    });

    if (remainingMinimumTime > 0) {
      // Need to wait for minimum duration to complete
      minimumTimeoutRef.current = setTimeout(() => {
        console.log('📺 Realtime activity: Minimum duration reached, starting cooldown');
        
        // Start cooldown period
        cooldownTimeoutRef.current = setTimeout(() => {
          console.log('📺 Realtime activity: Cooldown complete, hiding indicator');
          setIsShowingActivity(false);
          showStartTimeRef.current = null;
        }, cooldownDuration);
      }, remainingMinimumTime);
    } else {
      // Minimum duration already met, start cooldown immediately
      console.log('📺 Realtime activity: Starting immediate cooldown');
      cooldownTimeoutRef.current = setTimeout(() => {
        console.log('📺 Realtime activity: Cooldown complete, hiding indicator');
        setIsShowingActivity(false);
        showStartTimeRef.current = null;
      }, cooldownDuration);
    }
  }, [minimumDuration, cooldownDuration]);

  // React to processing state changes
  useEffect(() => {
    if (isProcessingUpdate) {
      // Processing started - immediately show activity
      if (!isShowingActivity) {
        startActivity();
      }
    } else {
      // Processing stopped - begin minimum duration + cooldown logic
      if (isShowingActivity) {
        stopActivity();
      }
    }
  }, [isProcessingUpdate, isShowingActivity, startActivity, stopActivity]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimeouts();
    };
  }, [clearTimeouts]);

  return {
    isShowingRealtimeActivity: isShowingActivity,
    // Debug info for development
    debugInfo: {
      isProcessingUpdate,
      isShowingActivity,
      showStartTime: showStartTimeRef.current,
      hasActiveTimeouts: !!(cooldownTimeoutRef.current || minimumTimeoutRef.current)
    }
  };
};