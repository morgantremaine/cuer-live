import { useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { normalizeTimestamp } from '@/utils/realtimeUtils';
import { RealtimeWatchdog } from '@/utils/realtimeWatchdog';

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
  recentSaves: Set<string>; // Track recent save timestamps
  cleanup?: () => void;
}>();

// Global function to register recent saves
export const registerRecentSave = (rundownId: string, timestamp: string) => {
  const manager = globalListenerManager.get(rundownId);
  if (manager) {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    manager.recentSaves.add(normalizedTimestamp);
    // Clean up old saves after 10 seconds
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
 * Hook to handle rundown data resumption after disconnections or focus events
 * Detects when the tab becomes visible or gains focus and checks for updates
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
  const watchdogRef = useRef<RealtimeWatchdog | null>(null);
  
  // Create content signature for comparison
  const createContentSignature = useCallback((data: any) => {
    if (!data || !data.items) return '';
    return JSON.stringify(data.items.map((item: any) => ({
      id: item.id,
      name: item.name,
      duration: item.duration,
      type: item.type,
      order: item.order
    })));
  }, []);

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
      
      // Avoid rapid checks (increased to 5 seconds)
      if (now - manager.lastCheck < 5000) {
        return;
      }

      manager.lastCheck = now;
      
      try {
        
        const latestData = await fetchLatestRundownData(rundownId);
        
        if (latestData) {
          const normalizedLatest = normalizeTimestamp(latestData.updated_at);
          const normalizedKnown = normalizeTimestamp(lastKnownTimestamp);
          
          // Check if this is a recent save we made
          if (manager.recentSaves.has(normalizedLatest)) {
            // Update our known timestamp to this value
            if (updateLastKnownTimestamp) {
              updateLastKnownTimestamp(normalizedLatest);
            }
            return;
          }
          
          if (normalizedLatest !== normalizedKnown) {
            console.log('🔄 Stale data detected - fetching latest data (no reload)');
            
            // Just fetch and apply the latest data through the connection
            onDataRefresh(latestData);
            
            // Update our known timestamp
            if (updateLastKnownTimestamp) {
              updateLastKnownTimestamp(normalizedLatest);
            }
          }
        }
      } catch (error) {
        console.error(`❌ [${eventSource}] Failed to check for updates:`, error);
      } finally {
        manager.pendingCheck = null;
      }
    }, 5000); // 5 second debounce to avoid aggressive checks during tab switching
  }, [rundownId, enabled, lastKnownTimestamp, onDataRefresh, toast, updateLastKnownTimestamp, createContentSignature]);

  // Global listener management and event handling
  useEffect(() => {
    if (!rundownId || !enabled) return;

    const hookId = hookIdRef.current;
    
    // Initialize or get existing manager for this rundown
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

    // Only set up listeners if this is the first hook for this rundown
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

      // Initialize watchdog for this rundown if not already done
      if (!watchdogRef.current) {
        watchdogRef.current = RealtimeWatchdog.getInstance(rundownId, 'resumption-handler', {
          onStaleData: (latestData) => {
            console.log('🔄 Resumption watchdog detected stale data');
            onDataRefresh(latestData);
            if (updateLastKnownTimestamp && latestData.updated_at) {
              updateLastKnownTimestamp(latestData.updated_at);
            }
          }
        });
        watchdogRef.current.start();
      }

      // Store cleanup function in manager
      manager.cleanup = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        window.removeEventListener('focus', handleFocus);
        window.removeEventListener('online', handleOnline);
        
        // Clean up watchdog
        if (watchdogRef.current) {
          watchdogRef.current.stop();
          RealtimeWatchdog.cleanup(rundownId, 'resumption-handler');
          watchdogRef.current = null;
        }
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