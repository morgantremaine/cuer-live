import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeTimestamp } from '@/utils/realtimeUtils';

/**
 * Fetches the latest rundown data from the server
 */
const fetchLatestRundownData = async (rundownId: string) => {
  try {
    const { data, error } = await supabase
      .from('rundowns')
      .select('*')
      .eq('id', rundownId)
      .single();

    if (error) {
      console.error('❌ Failed to fetch latest rundown:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('❌ Error fetching latest rundown:', error);
    return null;
  }
};

// Global manager to prevent duplicate listeners per rundown
const globalListenerManager = new Map<string, {
  listeners: Set<string>;
  pendingCheck: NodeJS.Timeout | null;
  lastCheck: number;
  recentSaves: Set<string>;
  cleanup?: () => void;
}>();

// Global function to register recent saves
export const registerRecentSave = (rundownId: string, timestamp: string) => {
  const manager = globalListenerManager.get(rundownId);
  if (manager) {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    manager.recentSaves.add(normalizedTimestamp);
    setTimeout(() => {
      manager.recentSaves.delete(normalizedTimestamp);
    }, 10000);
  }
};

interface UseRundownResumptionProps {
  rundownId: string | null;
  onDataRefresh: (latestData: any) => void;
  lastKnownTimestamp: string | null;
  enabled?: boolean;
  updateLastKnownTimestamp?: (timestamp: string) => void;
}

/**
 * Hook to handle rundown data resumption after disconnections or focus events.
 * Simplified version - relies on UnifiedConnectionHealth for reconnection management.
 */
export const useRundownResumption = ({
  rundownId,
  onDataRefresh,
  lastKnownTimestamp,
  enabled = true,
  updateLastKnownTimestamp
}: UseRundownResumptionProps) => {
  const { toast } = useToast();
  const hookIdRef = useRef(`hook-${Math.random().toString(36).substr(2, 9)}`);
  
  // Non-blocking check for updates
  const performCheck = useCallback(async (eventSource: string) => {
    if (!rundownId || !enabled || !lastKnownTimestamp) {
      return;
    }

    const manager = globalListenerManager.get(rundownId);
    if (!manager) return;

    if (manager.pendingCheck) {
      clearTimeout(manager.pendingCheck);
    }

    manager.pendingCheck = setTimeout(async () => {
      const now = Date.now();
      
      if (now - manager.lastCheck < 2000) {
        return;
      }

      manager.lastCheck = now;
      
      (async () => {
        try {
          const latestData = await fetchLatestRundownData(rundownId);
          
          if (latestData) {
            const normalizedLatest = normalizeTimestamp(latestData.updated_at);
            const normalizedKnown = normalizeTimestamp(lastKnownTimestamp);
            
            if (manager.recentSaves.has(normalizedLatest)) {
              if (updateLastKnownTimestamp) {
                updateLastKnownTimestamp(normalizedLatest);
              }
              return;
            }
            
            if (normalizedLatest !== normalizedKnown) {
              console.log('🔄 Stale data detected - fetching latest data');
              onDataRefresh(latestData);
              
              if (updateLastKnownTimestamp) {
                updateLastKnownTimestamp(normalizedLatest);
              }
            }
          }
        } catch (error) {
          console.error(`❌ [${eventSource}] Failed to check for updates:`, error);
        }
      })();
      
      manager.pendingCheck = null;
    }, 1000);
  }, [rundownId, enabled, lastKnownTimestamp, onDataRefresh, updateLastKnownTimestamp]);

  // Global listener management
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const hookId = hookIdRef.current;
    
    if (!globalListenerManager.has(rundownId)) {
      globalListenerManager.set(rundownId, {
        listeners: new Set(),
        pendingCheck: null,
        lastCheck: 0,
        recentSaves: new Set()
      });
    }

    const manager = globalListenerManager.get(rundownId)!;
    manager.listeners.add(hookId);

    const isFirstListener = manager.listeners.size === 1;

    if (isFirstListener) {
      const handleVisibilityChange = () => {
        if (!document.hidden) {
          performCheck('visibility');
        }
      };

      const handleFocus = () => {
        performCheck('focus');
      };

      const handleOnline = () => {
        performCheck('online');
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      window.addEventListener('focus', handleFocus);
      window.addEventListener('online', handleOnline);

      manager.cleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
      };
    }

    return () => {
      manager.listeners.delete(hookId);
      
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
