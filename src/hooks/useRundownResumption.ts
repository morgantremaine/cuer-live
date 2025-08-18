import { useEffect, useRef, useCallback } from 'react';
import { fetchLatestRundownData } from '@/utils/optimisticConcurrency';
import { useToast } from '@/hooks/use-toast';

interface UseRundownResumptionProps {
  rundownId: string | null;
  onDataRefresh: (latestData: any) => void;
  lastKnownTimestamp: string | null;
  enabled?: boolean;
}

/**
 * Hook to handle rundown data resumption after disconnections or focus events
 * Detects when the tab becomes visible or gains focus and checks for updates
 */
export const useRundownResumption = ({
  rundownId,
  onDataRefresh,
  lastKnownTimestamp,
  enabled = true
}: UseRundownResumptionProps) => {
  const { toast } = useToast();
  const lastCheckRef = useRef<number>(0);
  const isCheckingRef = useRef(false);

  const checkForUpdates = useCallback(async () => {
    if (!rundownId || !enabled || isCheckingRef.current || !lastKnownTimestamp) {
      return;
    }

    // Avoid rapid checks
    const now = Date.now();
    if (now - lastCheckRef.current < 5000) {
      return;
    }

    lastCheckRef.current = now;
    isCheckingRef.current = true;

    try {
      console.log('🔄 Checking for rundown updates after resumption...');
      
      const latestData = await fetchLatestRundownData(rundownId);
      
      if (latestData && latestData.updated_at !== lastKnownTimestamp) {
        console.log('📥 Updates detected - refreshing rundown data');
        
        toast({
          title: "Updates detected",
          description: "Your rundown has been updated with the latest changes from your team.",
          duration: 4000,
        });
        
        onDataRefresh(latestData);
      } else {
        console.log('✅ No updates detected - rundown is current');
      }
    } catch (error) {
      console.error('❌ Failed to check for updates:', error);
    } finally {
      isCheckingRef.current = false;
    }
  }, [rundownId, enabled, lastKnownTimestamp, onDataRefresh, toast]);

  // Listen for visibility change events
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Tab became visible - checking for updates');
        setTimeout(() => checkForUpdates(), 1000); // Small delay to let things settle
      }
    };

    const handleFocus = () => {
      console.log('🎯 Window gained focus - checking for updates');
      setTimeout(() => checkForUpdates(), 1000);
    };

    const handleOnline = () => {
      console.log('🌐 Network came back online - checking for updates');
      setTimeout(() => checkForUpdates(), 2000);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('online', handleOnline);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('online', handleOnline);
    };
  }, [checkForUpdates]);

  return {
    checkForUpdates: useCallback(() => {
      checkForUpdates();
    }, [checkForUpdates])
  };
};