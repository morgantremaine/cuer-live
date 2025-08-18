import { useEffect, useRef, useCallback } from 'react';
import { fetchLatestRundownData } from '@/utils/optimisticConcurrency';
import { useToast } from '@/hooks/use-toast';

// Global manager to prevent duplicate listeners per rundown
const globalListenerManager = new Map<string, {
  listeners: Set<string>;
  pendingCheck: NodeJS.Timeout | null;
  lastCheck: number;
  cleanup?: () => void;
}>();

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
  const hookIdRef = useRef(`hook-${Math.random().toString(36).substr(2, 9)}`);
  
  // Debounced check for updates with event source tracking
  const performCheck = useCallback(async (eventSource: string) => {
    if (!rundownId || !enabled || !lastKnownTimestamp) {
      return;
    }

    const manager = globalListenerManager.get(rundownId);
    if (!manager) return;

    // Clear any pending check and set a new one
    if (manager.pendingCheck) {
      clearTimeout(manager.pendingCheck);
    }

    manager.pendingCheck = setTimeout(async () => {
      const now = Date.now();
      
      // Avoid rapid checks
      if (now - manager.lastCheck < 3000) {
        console.log(`🔄 [${eventSource}] Skipping check - too recent (${now - manager.lastCheck}ms ago)`);
        return;
      }

      manager.lastCheck = now;
      
      try {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) {
          console.log(`🔄 [${eventSource}] Checking for rundown updates after resumption...`);
        }
        
        const latestData = await fetchLatestRundownData(rundownId);
        
        if (latestData && latestData.updated_at !== lastKnownTimestamp) {
          console.log(`📥 [${eventSource}] Updates detected - refreshing rundown data`);
          
          toast({
            title: "Updates detected",
            description: "Your rundown has been updated with the latest changes from your team.",
            duration: 4000,
          });
          
          onDataRefresh(latestData);
        } else if (isDev) {
          console.log(`✅ [${eventSource}] No updates detected - rundown is current`);
        }
      } catch (error) {
        console.error(`❌ [${eventSource}] Failed to check for updates:`, error);
      } finally {
        manager.pendingCheck = null;
      }
    }, 500); // Short debounce to coalesce rapid events
  }, [rundownId, enabled, lastKnownTimestamp, onDataRefresh, toast]);

  // Global listener management and event handling
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const hookId = hookIdRef.current;
    
    // Initialize or get existing manager for this rundown
    if (!globalListenerManager.has(rundownId)) {
      globalListenerManager.set(rundownId, {
        listeners: new Set(),
        pendingCheck: null,
        lastCheck: 0
      });
    }

    const manager = globalListenerManager.get(rundownId)!;
    manager.listeners.add(hookId);

    // Only set up listeners if this is the first hook for this rundown
    const isFirstListener = manager.listeners.size === 1;

    if (isFirstListener) {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          const isDev = process.env.NODE_ENV === 'development';
          if (isDev) console.log('👁️ [visibility] Tab became visible');
          performCheck('visibility');
        }
      };

      const handleFocus = () => {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) console.log('🎯 [focus] Window gained focus');
        performCheck('focus');
      };

      const handleOnline = () => {
        const isDev = process.env.NODE_ENV === 'development';
        if (isDev) console.log('🌐 [online] Network came back online');
        performCheck('online');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleOnline);

      // Store cleanup function in manager
      manager.cleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
      };
    }

    return () => {
      manager.listeners.delete(hookId);
      
      // If this was the last listener for this rundown, clean up
      if (manager.listeners.size === 0) {
        if (manager.cleanup) manager.cleanup();
        if (manager.pendingCheck) clearTimeout(manager.pendingCheck);
        globalListenerManager.delete(rundownId);
      }
    };
  }, [rundownId, enabled, performCheck]);

  return {
    checkForUpdates: useCallback(() => {
      performCheck('manual');
    }, [performCheck])
  };
};